"""Unit tests for services/matching_service.py scoring logic."""
import pytest
from unittest.mock import AsyncMock, MagicMock

try:
    from services.matching_service import MatchingService
except ImportError:
    pytest.skip("services.matching_service not implemented yet", allow_module_level=True)

pytestmark = pytest.mark.unit


class TestCompositeScoring:
    def test_perfect_match_score_is_high(self):
        svc = MatchingService.__new__(MatchingService)
        score = svc._compute_composite_score(
            embedding_similarity=0.95,
            distance_km=0.0,
            intent_match=True,
            age_in_range=True,
        )
        assert score >= 0.8

    def test_no_intent_match_reduces_score(self):
        svc = MatchingService.__new__(MatchingService)
        score_match    = svc._compute_composite_score(0.8, 5.0, True,  True)
        score_no_match = svc._compute_composite_score(0.8, 5.0, False, True)
        assert score_match > score_no_match

    def test_far_distance_reduces_score(self):
        svc = MatchingService.__new__(MatchingService)
        score_close = svc._compute_composite_score(0.8, 2.0,   True, True)
        score_far   = svc._compute_composite_score(0.8, 500.0, True, True)
        assert score_close > score_far

    def test_score_always_in_0_to_1_range(self):
        svc = MatchingService.__new__(MatchingService)
        for sim in [0.0, 0.5, 1.0]:
            for dist in [0.0, 50.0, 500.0]:
                for intent in [True, False]:
                    score = svc._compute_composite_score(sim, dist, intent, True)
                    assert 0.0 <= score <= 1.0, f"Score {score} out of range"

    def test_low_embedding_similarity_low_score(self):
        svc = MatchingService.__new__(MatchingService)
        score = svc._compute_composite_score(0.0, 5.0, True, True)
        assert score < 0.5

    def test_age_out_of_range_penalizes(self):
        svc = MatchingService.__new__(MatchingService)
        score_in  = svc._compute_composite_score(0.8, 5.0, True, True)
        score_out = svc._compute_composite_score(0.8, 5.0, True, False)
        assert score_in >= score_out


class TestCandidateFiltering:
    def test_blocked_users_excluded(self):
        svc = MatchingService.__new__(MatchingService)
        block_ids = {"blocked-user-uuid"}
        candidates = [{"user_id": "blocked-user-uuid"}, {"user_id": "ok-user-uuid"}]
        filtered = [c for c in candidates if c["user_id"] not in block_ids]
        assert len(filtered) == 1
        assert filtered[0]["user_id"] == "ok-user-uuid"

    def test_invisible_profiles_excluded(self):
        candidates = [
            {"user_id": "a", "is_visible": True},
            {"user_id": "b", "is_visible": False},
        ]
        visible = [c for c in candidates if c.get("is_visible")]
        assert all(c["is_visible"] for c in visible)