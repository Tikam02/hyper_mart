import re
import secrets
import string

ALPHABET = string.ascii_uppercase + string.digits


def random_code(length: int = 8) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def coupon_code(title: str) -> str:
    slug = re.sub(r"[^A-Z0-9]", "", title.upper())[:10] or "OFFER"
    return f"{slug}-{random_code(4)}"
