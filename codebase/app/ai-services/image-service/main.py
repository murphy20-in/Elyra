from contextlib import asynccontextmanager
from fastapi import FastAPI
from schemas import (
    FaceVerifyRequest, FaceVerifyResponse,
    ImageModerationRequest, ImageModerationResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Elyra Image Service",
    description="Image moderation and face verification. Currently stub — replace with NudeNet/DeepFace.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.post("/verify/face", response_model=FaceVerifyResponse)
async def verify_face(request: FaceVerifyRequest) -> FaceVerifyResponse:
    return FaceVerifyResponse(
        verified=True,
        confidence=0.95,
        message="stub: auto-approved — replace with real CV model in production",
    )


@app.post("/moderate/image", response_model=ImageModerationResponse)
async def moderate_image(request: ImageModerationRequest) -> ImageModerationResponse:
    return ImageModerationResponse(
        is_safe=True,
        confidence=1.0,
        categories=[],
        action="allow",
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "note": "stub_service — real CV model not yet integrated",
    }