"""Unit tests for Pydantic schema validation."""
import pytest
from pydantic import ValidationError
from schemas.auth import RegisterRequest
from schemas.profile import PublicProfileUpdate
from schemas.safety import SafeSessionCreate

pytestmark = pytest.mark.unit


class TestRegisterSchema:
    def test_valid_registration(self):
        data = RegisterRequest(
            email="test@example.com",
            password="ValidPass123!",
            display_name="Alex",
            age=25,
            gender_identity="non-binary",
            sexual_orientation="pansexual",
            intent="exploring",
            city="Mumbai",
        )
        assert data.email == "test@example.com"

    def test_weak_password_rejected(self):
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="t@example.com",
                password="weak",
                display_name="T", age=25,
                gender_identity="man", sexual_orientation="gay",
                intent="exploring", city="Delhi",
            )

    def test_underage_rejected(self):
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="young@example.com",
                password="ValidPass123!",
                display_name="Young", age=16,
                gender_identity="woman", sexual_orientation="straight",
                intent="exploring", city="Mumbai",
            )

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="not-an-email",
                password="ValidPass123!",
                display_name="T", age=25,
                gender_identity="man", sexual_orientation="gay",
                intent="exploring", city="Delhi",
            )


class TestPublicProfileSchema:
    def test_bio_max_length_enforced(self):
        with pytest.raises(ValidationError):
            PublicProfileUpdate(bio="x" * 301)

    def test_display_name_max_length_enforced(self):
        with pytest.raises(ValidationError):
            PublicProfileUpdate(display_name="a" * 101)

    def test_valid_update(self):
        update = PublicProfileUpdate(bio="Short bio", city="Chennai")
        assert update.city == "Chennai"


class TestSafeSessionSchema:
    def test_valid_safe_session(self):
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        later = now + timedelta(hours=2)
        s = SafeSessionCreate(
            emergency_contact_name="Mom",
            emergency_contact_phone="+919876543210",
            check_in_interval_min=30,
            scheduled_at=later,
        )
        assert s.check_in_interval_min == 30

    def test_invalid_phone_rejected(self):
        with pytest.raises(ValidationError):
            SafeSessionCreate(
                emergency_contact_name="Mom",
                emergency_contact_phone="not-a-phone",
                check_in_interval_min=30,
                scheduled_at=None,
            )