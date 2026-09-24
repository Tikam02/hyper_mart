import re

from pydantic import BaseModel, field_validator

PHONE_RE = re.compile(r"^[6-9]\d{9}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")


class OtpRequestIn(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "").replace("-", "")
        if v.startswith("+91"):
            v = v[3:]
        elif v.startswith("91") and len(v) == 12:
            v = v[2:]
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v


class OtpVerifyIn(OtpRequestIn):
    code: str


class OtpRequestOut(BaseModel):
    expires_in_seconds: int
    dev_code: str | None = None


class UserUpdateIn(BaseModel):
    email: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if not v or not v.strip():
            return None
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v


class UserOut(BaseModel):
    id: int
    phone: str
    email: str | None
    role: str

    model_config = {"from_attributes": True}
