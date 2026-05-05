from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from schemas import (
    TextModerationRequest, TextModerationResponse,
    BatchModerationRequest, BatchModerationResponse,
)
from classifier import classifier, DETOXIFY_AVAILABLE


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Elyra Moderation Service", version="1.0.0", lifespan=lifespan)


@app.post("/moderate/text", response_model=TextModerationResponse)
async def moderate_text(request: TextModerationRequest) -> TextModerationResponse:
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    result = classifier.classify(request.text)
    return TextModerationResponse(**result)


@app.post("/moderate/batch", response_model=BatchModerationResponse)
async def moderate_batch(request: BatchModerationRequest) -> BatchModerationResponse:
    if not request.texts:
        raise HTTPException(status_code=422, detail="texts list must not be empty")
    results = [TextModerationResponse(**classifier.classify(t.text)) for t in request.texts]
    return BatchModerationResponse(
        results=results,
        total=len(results),
        blocked_count=sum(1 for r in results if r.action == "block"),
        flagged_count=sum(1 for r in results if r.action == "flag"),
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": DETOXIFY_AVAILABLE,
        "model": "detoxify/original" if DETOXIFY_AVAILABLE else "keyword-only fallback",
    }