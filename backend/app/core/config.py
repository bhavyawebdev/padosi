"""Application settings loaded from environment / .env file."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "LocalPulse API"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Dev conveniences
    SEED_DEMO_DATA: bool = True

    # Data layer
    DATABASE_URL: str = (
        "postgresql+asyncpg://localpulse:localpulse@localhost:5432/localpulse"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET: str = "dev-only-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7  # 7 days
    PASSWORD_RESET_TTL_MINUTES: int = 30
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    # Feature defaults
    DEFAULT_RADIUS_KM: float = 3.0
    FEED_EXPIRY_HOURS_DEFAULT: int = 12
    # Per-category expiry (hours) — a "pulse", not a permanent post.
    FEED_EXPIRY_HOURS_BY_CATEGORY: dict[str, int] = {
        "traffic": 6,
        "safety": 6,
        "utility": 12,
        "civic": 12,
        "event": 24,
        "other": 12,
    }
    VERIFIED_REVIEW_THRESHOLD: int = 3
    POST_RATE_LIMIT_PER_HOUR: int = 10
    REQUEST_DEFAULT_HOURS: int = 24


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
