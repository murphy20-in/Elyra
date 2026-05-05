from typing import Optional
from blocklist import check_immediate_block, check_high_risk

try:
    from detoxify import Detoxify
    _detoxify_model = Detoxify('original')
    DETOXIFY_AVAILABLE = True
except Exception:
    _detoxify_model = None
    DETOXIFY_AVAILABLE = False

THRESHOLD_FLAG = 0.5
THRESHOLD_BLOCK = 0.8

CATEGORY_MAP = {
    'toxicity': 'harassment',
    'severe_toxicity': 'harassment',
    'obscene': 'profanity',
    'threat': 'threat',
    'insult': 'harassment',
    'identity_attack': 'hate',
    'sexual_explicit': 'sexual',
}


class ToxicityClassifier:
    def classify(self, text: str) -> dict:
        text = text.strip()
        if not text:
            return {"is_toxic": False, "toxicity_score": 0.0, "categories": [], "action": "allow"}

        matched = check_immediate_block(text)
        if matched:
            return {
                "is_toxic": True,
                "toxicity_score": 1.0,
                "categories": ["severe_violation"],
                "action": "block",
            }

        high_risk_hits = check_high_risk(text)
        keyword_score = min(len(high_risk_hits) * 0.25, 0.75) if high_risk_hits else 0.0
        keyword_categories = ["harassment"] if high_risk_hits else []

        if DETOXIFY_AVAILABLE and _detoxify_model is not None:
            scores = _detoxify_model.predict(text)
            category_scores = {}
            for detox_key, elyra_cat in CATEGORY_MAP.items():
                raw_score = float(scores.get(detox_key, 0.0))
                category_scores[elyra_cat] = max(category_scores.get(elyra_cat, 0.0), raw_score)
        else:
            category_scores = {"harassment": keyword_score}

        if keyword_categories:
            for cat in keyword_categories:
                category_scores[cat] = min(1.0, category_scores.get(cat, 0.0) + 0.3)

        max_score = max(category_scores.values()) if category_scores else 0.0
        final_score = max(max_score, keyword_score)

        flagged_categories = [cat for cat, score in category_scores.items() if score >= THRESHOLD_FLAG]

        if final_score >= THRESHOLD_BLOCK:
            action = "block"
        elif final_score >= THRESHOLD_FLAG:
            action = "flag"
        else:
            action = "allow"

        return {
            "is_toxic": final_score >= THRESHOLD_FLAG,
            "toxicity_score": round(final_score, 4),
            "categories": flagged_categories,
            "action": action,
        }

    def classify_batch(self, texts: list[str]) -> list[dict]:
        return [self.classify(t) for t in texts]


classifier = ToxicityClassifier()