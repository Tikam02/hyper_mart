import logging
import random

from app.config import get_settings

logger = logging.getLogger("hylo.otp")


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_otp(phone: str, code: str) -> None:
    settings = get_settings()
    if settings.otp_provider == "stub":
        logger.info("OTP for %s: %s", phone, code)
        return
    if settings.otp_provider == "msg91":
        raise NotImplementedError("MSG91 integration is a V1.1 item — see PRD §8")
    raise RuntimeError(f"Unknown OTP_PROVIDER: {settings.otp_provider}")
