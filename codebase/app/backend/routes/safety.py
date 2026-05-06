from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.redis_client import get_redis
from app.backend.core.dependencies import get_current_active_user, require_role
from app.backend.models.user import User
from app.backend.services.trust_safety_service import TrustSafetyService
from app.backend.services.safety_service import SafetyService
from app.backend.schemas.safety import (
    ReportCreate,
    BlockCreate,
    SafeSessionCreate,
    LocationUpdate,
    SOSTrigger,
    RiskScoreResponse,
    ReportResponse,
    BlockResponse,
    SafeSessionResponse,
)


router = APIRouter()


@router.post("/reports", response_model=ReportResponse, status_code=201)
async def create_report(
    data: ReportCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = TrustSafetyService(db)
        report = await svc.create_report(user.id, data)
        return ReportResponse.model_validate(report)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "REPORT_FAILED"},
        )


@router.get("/reports", response_model=list[ReportResponse])
async def list_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None),
    user: User = Depends(require_role("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = TrustSafetyService(db)
    result = await svc.list_reports(page, per_page, status_filter)
    return [ReportResponse.model_validate(r) for r in result["reports"]]


@router.patch("/reports/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: UUID,
    report_status: str,
    user: User = Depends(require_role("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = TrustSafetyService(db)
        report = await svc.update_report_status(report_id, report_status, user.id)
        return ReportResponse.model_validate(report)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UPDATE_FAILED"},
        )


@router.post("/blocks", response_model=BlockResponse, status_code=201)
async def block_user(
    data: BlockCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = TrustSafetyService(db)
        block = await svc.block_user(user.id, data)
        return BlockResponse.model_validate(block)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "BLOCK_FAILED"},
        )


@router.delete("/blocks/{blocked_user_id}", status_code=204)
async def unblock_user(
    blocked_user_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = TrustSafetyService(db)
    await svc.unblock_user(user.id, blocked_user_id)


@router.get("/blocks", response_model=list[BlockResponse])
async def list_blocks(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = TrustSafetyService(db)
    blocks = await svc.get_blocks(user.id)
    return [BlockResponse.model_validate(b) for b in blocks]


@router.get("/risk/{user_id}", response_model=RiskScoreResponse)
async def get_risk_score(
    user_id: UUID,
    user: User = Depends(require_role("moderator", "admin")),
    db: AsyncSession = Depends(get_db),
):
    svc = TrustSafetyService(db)
    result = await svc.calculate_risk_score(user_id)
    return RiskScoreResponse(**result)


@router.post("/sessions", response_model=SafeSessionResponse, status_code=201)
async def create_safe_session(
    data: SafeSessionCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = SafetyService(db, redis)
        session = await svc.create_safe_session(user.id, data)
        return SafeSessionResponse.model_validate(session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "SESSION_FAILED"},
        )


@router.post("/sessions/{session_id}/check-in", response_model=SafeSessionResponse)
async def check_in(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = SafetyService(db, redis)
        session = await svc.check_in(session_id, user.id)
        return SafeSessionResponse.model_validate(session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "CHECK_IN_FAILED"},
        )


@router.post("/sessions/{session_id}/location", status_code=204)
async def update_location(
    session_id: UUID,
    data: LocationUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = SafetyService(db, redis)
        await svc.update_location(session_id, user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "LOCATION_UPDATE_FAILED"},
        )


@router.post("/sessions/{session_id}/end", response_model=SafeSessionResponse)
async def end_session(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = SafetyService(db, redis)
        session = await svc.end_session(session_id, user.id)
        return SafeSessionResponse.model_validate(session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "END_SESSION_FAILED"},
        )


@router.get("/sessions/active", response_model=SafeSessionResponse)
async def get_active_session(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = SafetyService(db, redis)
    session = await svc.get_active_session(user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return SafeSessionResponse.model_validate(session)


@router.get("/sessions", response_model=list[SafeSessionResponse])
async def list_sessions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = SafetyService(db, redis)
    result = await svc.list_sessions(user.id, page, per_page)
    return [SafeSessionResponse.model_validate(s) for s in result["sessions"]]


@router.post("/sos", status_code=202)
async def trigger_sos(
    data: SOSTrigger,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = SafetyService(db, redis)
    await svc.trigger_sos(user.id, data)