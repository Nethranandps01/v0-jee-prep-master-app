from functools import lru_cache
import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "JPEE Backend"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "jpee"

    jwt_secret_key: str = "2c7f47c8b7f24c3ea9f4e4a9d9b1a8a1f4c3e2d9a7b5c1d0f9e8c7a6b5d4c3"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # Optional Redis connection URL, e.g. redis://localhost:6379/0
    redis_url: str | None = None

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://192.168.0.154:3000",
            "http://localhost",
            "capacitor://localhost",
        ]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed if str(origin).strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret_key(cls, value: str) -> str:
        if value.strip() in {"", "change-me-in-production"}:
            raise ValueError("jwt_secret_key must be set to a secure non-default value")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
