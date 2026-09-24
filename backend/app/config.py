from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "staging", "production"]
    database_url: str
    jwt_secret: str
    otp_provider: Literal["stub", "msg91"]
    upload_dir: str = "./uploads"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.otp_provider == "stub" and settings.environment != "local":
        raise RuntimeError(
            "OTP_PROVIDER=stub is not allowed outside ENVIRONMENT=local. "
            "Set OTP_PROVIDER=msg91 for staging/production."
        )
    return settings
