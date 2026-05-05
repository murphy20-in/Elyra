"""Unit tests for fake-profile heuristic scoring."""
import pytest

try:
    from services.trust_safety_service import TrustSafetyService
except ImportError:
    pytest.skip("services.trust_safety_service not implemented yet", allow_module_level=True)

pytestmark = pytest.mark.unit


class TestFakeProfileHeuristics:
    def test_complete_profile_low_fake_score(self):
        score = TrustSafetyService._heuristic_fake_score({
            "has_photo": True,
            "bio_length": 120,
            "email_verified": True,
            "phone_verified": True,
            "account_age_days": 30,
            "login_count": 15,
        })
        assert score < 0.3

    def test_no_photo_raises_score(self):
        with_photo    = TrustSafetyService._heuristic_fake_score({"has_photo": True,  "bio_length": 50, "email_verified": True, "phone_verified": False, "account_age_days": 10, "login_count": 2})
        without_photo = TrustSafetyService._heuristic_fake_score({"has_photo": False, "bio_length": 50, "email_verified": True, "phone_verified": False, "account_age_days": 10, "login_count": 2})
        assert without_photo > with_photo

    def test_empty_bio_raises_score(self):
        with_bio    = TrustSafetyService._heuristic_fake_score({"has_photo": True, "bio_length": 100, "email_verified": True, "phone_verified": True, "account_age_days": 20, "login_count": 5})
        without_bio = TrustSafetyService._heuristic_fake_score({"has_photo": True, "bio_length": 0,   "email_verified": True, "phone_verified": True, "account_age_days": 20, "login_count": 5})
        assert without_bio > with_bio

    def test_score_is_0_to_1(self):
        for combo in [
            {"has_photo": True,  "bio_length": 200, "email_verified": True,  "phone_verified": True,  "account_age_days": 365, "login_count": 50},
            {"has_photo": False, "bio_length": 0,   "email_verified": False, "phone_verified": False, "account_age_days": 0,   "login_count": 0},
        ]:
            score = TrustSafetyService._heuristic_fake_score(combo)
            assert 0.0 <= score <= 1.0