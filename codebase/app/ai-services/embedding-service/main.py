from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from schemas import EmbedRequest, EmbedResponse, SimilarityRequest, SimilarityResponse
from model import embedding_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    assert embedding_model.model is not None
    yield


app = FastAPI(title="Elyra Embedding Service", version="1.0.0", lifespan=lifespan)


@app.post("/embed", response_model=EmbedResponse)
async def generate_embedding(request: EmbedRequest) -> EmbedResponse:
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    embedding = embedding_model.encode(request.text.strip())
    return EmbedResponse(
        embedding=embedding,
        dimension=embedding_model.dimension,
        model=embedding_model.model_name,
    )


@app.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(request: SimilarityRequest) -> SimilarityResponse:
    if len(request.embedding_a) != 384 or len(request.embedding_b) != 384:
        raise HTTPException(status_code=422, detail="Both embeddings must be 384-dimensional")
    score = embedding_model.cosine_similarity(request.embedding_a, request.embedding_b)
    return SimilarityResponse(cosine_similarity=score)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": embedding_model.model is not None,
        "dimension": embedding_model.dimension,
        "model": embedding_model.model_name,
    }