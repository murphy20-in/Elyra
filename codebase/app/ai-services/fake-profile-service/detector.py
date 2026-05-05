import re
import numpy as np
from typing import Optional
from blocklist import DISPOSABLE_EMAIL_DOMAINS, SPAM_BIO_PATTERNS

SPAM_BIO_REGEX = [re.compile(p, re.IGNORECASE) for p in SPAM_BIO_PATTERNS]

WEIGHTS = {
    "no_photo":              0.30,
    "short_bio":             0.15,
    "new_account":           0.10,
    "disposable_email":      0.20,
    "embedding_clone":       0.40,
    "spam_bio":              0.25,
}

THRESHOLD_REVIEW = 0.40
THRESHOLD_BLOCK  = 0.70


class FakeProfileDetector:
    def score(
        self,
        bio: str,
        embedding: list[float],
        photo_count: int,
        account_age_days: int,
        email_domain: str,
        neighbor_embeddings: list[list[float]],
    ) -> dict:
        raw_score = 0.0
        factors = []

        if photo_count == 0:
            raw_score += WEIGHTS["no_photo"]
            factors.append("no_profile_photo")

        if not bio or len(bio.strip()) < 20:
            raw_score += WEIGHTS["short_bio"]
            factors.append("bio_too_short")

        if account_age_days < 1:
            raw_score += WEIGHTS["new_account"]
            factors.append("account_age_under_1_day")

        if email_domain.lower() in DISPOSABLE_EMAIL_DOMAINS:
            raw_score += WEIGHTS["disposable_email"]
            factors.append("disposable_email_domain")

        if neighbor_embeddings:
            emb_np = np.array(embedding)
            emb_norm = emb_np / (np.linalg.norm(emb_np) + 1e-8)
            for neighbor in neighbor_embeddings:
                n_np = np.array(neighbor)
                n_norm = n_np / (np.linalg.norm(n_np) + 1e-8)
                sim = float(np.dot(emb_norm, n_norm))
                if sim > 0.95:
                    raw_score += WEIGHTS["embedding_clone"]
                    factors.append(f"embedding_clone_similarity_{sim:.2f}")
                    break

        bio_lower = bio.lower()
        spam_hits = [p.pattern for p in SPAM_BIO_REGEX if p.search(bio_lower)]
        if spam_hits:
            raw_score += WEIGHTS["spam_bio"]
            factors.append("spam_pattern_in_bio")

        fake_probability = min(raw_score, 1.0)

        if fake_probability >= THRESHOLD_BLOCK:
            action = "block"
        elif fake_probability >= THRESHOLD_REVIEW:
            action = "review"
        else:
            action = "allow"

        return {
            "fake_probability": round(fake_probability, 4),
            "factors": factors,
            "action": action,
        }


detector = FakeProfileDetector()