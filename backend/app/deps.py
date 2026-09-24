from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.shop import Shop
from app.models.user import User
from app.services.security import SESSION_COOKIE, decode_access_token, new_session_id

DbDep = Depends(get_db)


def get_session_id(request: Request, response: Response) -> str:
    sid = request.cookies.get(SESSION_COOKIE)
    if sid:
        return sid
    sid = new_session_id()
    response.set_cookie(SESSION_COOKIE, sid, httponly=True, samesite="lax", max_age=365 * 24 * 3600)
    return sid


def get_current_user_optional(
    hh_token: str | None = Cookie(default=None),
    db: Session = DbDep,
) -> User | None:
    if not hh_token:
        return None
    payload = decode_access_token(hh_token)
    if not payload:
        return None
    return db.get(User, int(payload["sub"]))


def get_current_user(user: User | None = Depends(get_current_user_optional)) -> User:
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")
    return user


def get_current_shop(
    user: User = Depends(get_current_user),
    db: Session = DbDep,
) -> tuple[User, Shop]:
    shop = db.query(Shop).filter(Shop.owner_user_id == user.id).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No shop found for this account")
    return user, shop
