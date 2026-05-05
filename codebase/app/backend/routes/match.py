from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.dependencies import get_current_active_user
from app.backend.models.user import User
from app.backend.services.matching_service import MatchingService
from app.backend.schemas.match import MatchResponse, MatchListResponse, DiscoverResponse


router = APIRouter()


@router.get("/discover", response_model=DiscoverResponse)
async def discover(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = MatchingService(db)
    result = await svc.get_candidates(user.id, page, per_page)
    return DiscoverResponse(**result)


@router.post("/like/{target_user_id}")
async def like_user(
    target_user_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = MatchingService(db)
        return await svc.like_user(user.id, target_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "LIKE_FAILED"},
        )


@router.post("/pass/{target_user_id}", status_code=204)
async def pass_user(
    target_user_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = MatchingService(db)
    await svc.pass_user(user.id, target_user_id)


@router.get("", response_model=MatchListResponse)
async def list_matches(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, or_
    from app.backend.models.match import Match
    from app.backend.schemas.profile import PublicProfileResponse
    from sqlalchemy.orm import selectinload

    offset = (page - 1) * per_page

    result = await db.execute(
        select(Match)
        .where(
            or_(Match.user_id_1 == str(user.id), Match.user_id_2 == str(user.id))
        )
        .where(Match.status == "matched")
        .order_by(Match.matched_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    matches = result.scalars().all()

    return MatchListResponse(
        matches=[
            MatchResponse(
                id=m.id,
                user_id_1=m.user_id_1,
                user_id_2=m.user_id_2,
                status=m.status,
                liked_by_1=m.liked_by_1,
                liked_by_2=m.liked_by_2,
                match_score=m.match_score,
                matched_at=m.matched_at,
                created_at=m.created_at,
            )
            for m in matches
        ],
        total=len(matches),
        page=page,
    )


@router.delete("/{match_id}", status_code=204)
async def unmatch(
    match_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = MatchingService(db)
        await svc.unmatch(match_id, user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UNMATCH_FAILED"},
        )


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.backend.models.match import Match

    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if str(user.id) != match.user_id_1 and str(user.id) != match.user_id_2:
        raise HTTPException(status_code=403, detail="Not authorized")

    return match