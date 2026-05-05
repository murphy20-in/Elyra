from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from schemas import FakeProfileRequest, FakeProfileResponse
from detector import detector


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Elyra Fake Profile Detection Service", version="1.0.0", lifespan=lifespan)


@app.post("/score", response_model=FakeProfileResponse)
async def score_profile(request: FakeProfileRequest) -> FakeProfileResponse:
    if not request.user_id:
        raise HTTPException(status_code=422, detail="user_id is required")
    result = detector.score(
        bio=request.bio,
        embedding=request.embedding,
        photo_count=request.photo_count,
        account_age_days=request.account_age_days,
        email_domain=request.email_domain,
        neighbor_embeddings=request.neighbor_embeddings,
    )
    return FakeProfileResponse(**result)


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": True, "detector": "heuristic+embedding-anomaly"}