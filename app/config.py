"""Settings, loaded from the environment and validated before anything can dial.

Two choices worth explaining:

1. The assessment line is a module constant, not a setting. ALLOWED_DESTINATION
   still exists in .env.example because the challenge asks for it, but if it
   disagrees with the constant the app refuses to start. An environment variable
   is easy to change by accident or by a stray shell export; a constant has to be
   edited in code, where it shows up in a diff.

2. Validation is fail-fast and happens in one place. Every path that can reach
   Twilio calls get_settings() first, so a missing or malformed value stops the
   process before a call is placed rather than halfway through one.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The only number this project is ever permitted to dial.
ASSESSMENT_LINE = "+18054398008"

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def is_e164(number: str) -> bool:
    return bool(_E164.match(number or ""))


class ConfigError(RuntimeError):
    """Raised when the environment is not safe to place calls from."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # min_length=1 matters: a key present but blank in .env is the common mistake,
    # and a bare `str` accepts "" happily. Better to refuse now than mid-call.
    twilio_account_sid: str = Field(min_length=1)
    twilio_auth_token: str = Field(min_length=1)
    twilio_phone_number: str = Field(min_length=1)
    openai_api_key: str = Field(min_length=1)
    public_base_url: str = Field(min_length=1)

    allowed_destination: str = ASSESSMENT_LINE
    realtime_model: str = "gpt-realtime-2.1"
    realtime_voice: str = "cedar"
    evaluator_model: str = "gpt-4.1"
    artifacts_dir: Path = Path("artifacts/calls")
    max_call_seconds: int = Field(default=240, ge=30, le=600)

    @field_validator("twilio_phone_number")
    @classmethod
    def _caller_is_e164(cls, v: str) -> str:
        if not is_e164(v):
            raise ValueError(
                f"TWILIO_PHONE_NUMBER must be E.164 (e.g. +13334445555), got {v!r}"
            )
        return v

    @field_validator("public_base_url")
    @classmethod
    def _tunnel_is_https(cls, v: str) -> str:
        v = v.rstrip("/")
        if not v.startswith("https://"):
            raise ValueError(
                "PUBLIC_BASE_URL must be an https URL — Twilio will not connect a "
                f"Media Stream over plaintext. Got {v!r}"
            )
        return v

    @model_validator(mode="after")
    def _destination_matches_constant(self) -> "Settings":
        if self.allowed_destination != ASSESSMENT_LINE:
            raise ValueError(
                f"ALLOWED_DESTINATION is {self.allowed_destination!r} but this build "
                f"only dials {ASSESSMENT_LINE}. Refusing to start."
            )
        return self

    @property
    def websocket_url(self) -> str:
        """wss:// endpoint Twilio should connect the Media Stream to."""
        return self.public_base_url.replace("https://", "wss://", 1) + "/stream"


@lru_cache
def get_settings() -> Settings:
    """Load and validate settings, or raise ConfigError with a readable message."""
    try:
        return Settings()
    except Exception as exc:  # pydantic ValidationError or our ValueErrors
        raise ConfigError(f"Environment is not usable:\n{exc}") from exc
