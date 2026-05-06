"""Preference schemas (re-exported by schemas.profile for the /profiles router)."""
from __future__ import annotations

from app.backend.schemas.profile import PreferenceResponse, PreferenceUpdate


class PreferenceCreate(PreferenceUpdate):
    """Same shape as PreferenceUpdate for now — preferences are upserted."""


__all__ = ["PreferenceCreate", "PreferenceResponse", "PreferenceUpdate"]
