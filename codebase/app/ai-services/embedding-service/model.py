from sentence_transformers import SentenceTransformer
import numpy as np
from functools import lru_cache

MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingModel:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)
        self.dimension = 384
        self.model_name = MODEL_NAME

    @lru_cache(maxsize=1024)
    def _cached_encode(self, text: str) -> tuple:
        embedding = self.model.encode(text, normalize_embeddings=True)
        return tuple(embedding.tolist())

    def encode(self, text: str) -> list[float]:
        return list(self._cached_encode(text))

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        a_np = np.array(a)
        b_np = np.array(b)
        norm_a = np.linalg.norm(a_np)
        norm_b = np.linalg.norm(b_np)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a_np, b_np) / (norm_a * norm_b))


embedding_model = EmbeddingModel()