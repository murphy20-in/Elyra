"""Unit tests for risk score calculation in trust_safety_service.py."""
import pytest

try:
    from services.trust_safety_service import TrustSafetyService
except ImportError:
    pytest.skip("services.trust_safety_service not implemented yet", allow_module_level=True)

pytestmark = pytest.mark.unit


class TestRiskScoring:
    def test_zero_reports_low_risk(self):
        score = TrustSafetyService._calculate_risk_from_factors(
            report_count=0,
            upheld_reports=0,
            avg_toxicity=0.0,
            account_age_days=365,
            is_verified=True,
        )
        assert score < 0.2

    def test_many_upheld_reports_high_risk(self):
        score = TrustSafetyService._calculate_risk_from_factors(
            report_count=10,
            upheld_reports=8,
            avg_toxicity=0.7,
            account_age_days=5,
            is_verified=False,
        )
        assert score > 0.7

    def test_score_normalized_0_to_1(self):
        for reports in range(0, 20, 5):
            score = TrustSafetyService._calculate_risk_from_factors(
                report_count=reports,
                upheld_reports=reports // 2,
                avg_toxicity=0.3,
                account_age_days=30,
                is_verified=False,
            )
            assert 0.0 <= score <= 1.0

    def test_verified_user_lower_risk_than_unverified(self):
        base = dict(report_count=2, upheld_reports=1, avg_toxicity=0.2, account_age_days=100)
        score_verified   = TrustSafetyService._calculate_risk_from_factors(**base, is_verified=True)
        score_unverified = TrustSafetyService._calculate_risk_from_factors(**base, is_verified=False)
        assert score_verified < score_unverified

    def test_new_account_higher_risk(self):
        base = dict(report_count=0, upheld_reports=0, avg_toxicity=0.0, is_verified=False)
        score_new = TrustSafetyService._calculate_risk_from_factors(**base, account_age_days=1)
        score_old = TrustSafetyService._calculate_risk_from_factors(**base, account_age_days=365)
        assert score_new > score_old