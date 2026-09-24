import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings

AUTH_COOKIE = "hh_token"
SESSION_COOKIE = "hh_sid"
JWT_ALGORITHM = "HS256"
TOKEN_TTL_DAYS = 30


def create_access_token(user_id: int, phone: str, role: str) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "phone": phone,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def set_auth_cookie(response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        AUTH_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.environment != "local",
        max_age=TOKEN_TTL_DAYS * 24 * 3600,
    )


def clear_auth_cookie(response) -> None:
    response.delete_cookie(AUTH_COOKIE)


def new_session_id() -> str:
    return uuid.uuid4().hex
