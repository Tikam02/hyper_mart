from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import get_current_user, get_current_user_optional
from app.models.otp import OtpRequest
from app.models.user import User
from app.schemas.user import OtpRequestIn, OtpRequestOut, OtpVerifyIn, UserOut, UserUpdateIn
from app.services.otp import generate_code, send_otp
from app.services.rate_limit import check_rate_limit
from app.services.security import clear_auth_cookie, create_access_token, set_auth_cookie

router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_TTL_SECONDS = 5 * 60


@router.post("/otp/request", response_model=OtpRequestOut)
def request_otp(body: OtpRequestIn, request: Request, db: Session = Depends(get_db)) -> OtpRequestOut:
    check_rate_limit(f"otp:phone:{body.phone}", max_hits=3, window_seconds=600)
    check_rate_limit(f"otp:ip:{request.client.host}", max_hits=10, window_seconds=600)

    code = generate_code()
    db.add(
        OtpRequest(
            phone=body.phone,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS),
        )
    )
    db.commit()
    send_otp(body.phone, code)

    settings = get_settings()
    return OtpRequestOut(
        expires_in_seconds=OTP_TTL_SECONDS,
        dev_code=code if settings.otp_provider == "stub" else None,
    )


@router.post("/otp/verify", response_model=UserOut)
def verify_otp(body: OtpVerifyIn, response: Response, db: Session = Depends(get_db)) -> User:
    check_rate_limit(f"otp-verify:phone:{body.phone}", max_hits=5, window_seconds=600)

    otp = (
        db.query(OtpRequest)
        .filter(OtpRequest.phone == body.phone, OtpRequest.verified.is_(False))
        .order_by(OtpRequest.created_at.desc())
        .first()
    )
    now = datetime.now(timezone.utc)
    if not otp or otp.expires_at < now or otp.attempts >= 5:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired or not found, request a new one")
    if otp.code != body.code:
        otp.attempts += 1
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code")

    otp.verified = True
    user = db.query(User).filter(User.phone == body.phone).first()
    if not user:
        user = User(phone=body.phone)
        db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.phone, user.role)
    set_auth_cookie(response, token)
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut | None)
def me(user: User | None = Depends(get_current_user_optional)) -> User | None:
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UserUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
