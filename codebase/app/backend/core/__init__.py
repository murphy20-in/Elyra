from functools import cached_property

from pydantic import Field, field_validator
from pydantic_settings import SettingsConfigDict

from app.backend.core.config import Settings  # noqa: F401