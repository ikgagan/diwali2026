"""Application settings, loaded from environment variables or backend/.env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Google Drive (OAuth refresh-token flow, see scripts/get_refresh_token.py)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_refresh_token: str = ""
    drive_folder_id: str = ""
    drive_folder_link: str = ""

    # Web
    cors_origins: str = "http://localhost:5173"
    gallery_rotate_minutes: int = Field(default=20, ge=1, le=240)
    gallery_page_size: int = Field(default=10, ge=1, le=50)
    max_upload_mb: int = Field(default=25, ge=1, le=200)
    upload_rate_limit: str = "30/minute"
    index_refresh_seconds: int = Field(default=60, ge=10)

    # Protection
    event_passcode: str = ""
    admin_token: str = ""

    @field_validator("event_passcode", "admin_token", mode="before")
    @classmethod
    def _strip_placeholders(cls, value: str | None) -> str:
        value = (value or "").strip()
        if value.startswith("CHANGE_ME"):
            return ""
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def drive_configured(self) -> bool:
        return all(
            [
                self.google_client_id,
                self.google_client_secret,
                self.google_refresh_token,
                self.drive_folder_id,
            ]
        )

    @property
    def folder_link(self) -> str:
        if self.drive_folder_link:
            return self.drive_folder_link
        if self.drive_folder_id:
            return f"https://drive.google.com/drive/folders/{self.drive_folder_id}"
        return ""

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def rotate_seconds(self) -> int:
        return self.gallery_rotate_minutes * 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
