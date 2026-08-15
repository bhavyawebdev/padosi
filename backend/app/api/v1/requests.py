"""Need It Now — hyperlocal request board endpoints (Phase 4)."""
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.rate_limit import post_rate_limiter
from app.db.session import get_db
from app.models.feed import Report
from app.models.requests import Request, RequestReply
from app.models.user import User
from app.schemas.requests import (
    ReplyCreate,
    ReplyOut,
    RequestCreate,
    RequestDetailOut,
    RequestOut,
)
from app.schemas.feed import ReportCreate
from app.services.geo_engine import distance_expression, within_radius_expression

router = APIRouter()

DEFAULT_REQUEST_RADIUS_KM = 3.0


def _request_out(row) -> RequestOut:
    req, distance_m, reply_count = row
    return RequestOut(
        id=req.id,
        user_id=req.user_id,
        author_name=req.author.full_name,
        type=req.type,  # type: ignore[arg-type]
        text=req.text,
        distance_m=distance_m,
        needed_by=req.needed_by,
        status=req.status,  # type: ignore[arg-type]
        reply_count=reply_count or 0,
        created_at=req.created_at,
    )


@router.get("", response_model=list[RequestOut])
async def list_requests(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_km: float | None = Query(default=None, ge=0.1, le=50),
    type: Literal["borrow_lend", "ride_share", "spare_item", "other"] | None = None,
    status: Literal["open", "fulfilled", "expired"] = "open",
    q: str | None = Query(default=None, max_length=120),
    db: AsyncSession = Depends(get_db),
) -> list[RequestOut]:
    radius_m = (radius_km or DEFAULT_REQUEST_RADIUS_KM) * 1000
    now = datetime.now(timezone.utc)
    dist = distance_expression(Request.location, lat, lng)
    reply_count = (
        select(RequestReply.request_id, func.count().label("cnt"))
        .group_by(RequestReply.request_id)
        .subquery()
    )
    stmt = (
        select(Request, dist, reply_count.c.cnt)
        .outerjoin(reply_count, reply_count.c.request_id == Request.id)
        .where(within_radius_expression(Request.location, lat, lng, radius_m))
        .order_by(Request.needed_by.asc(), dist.asc())
    )
    if type:
        stmt = stmt.where(Request.type == type)
    if q:
        stmt = stmt.where(Request.text.ilike(f"%{q.strip()}%"))
    if status == "open":
        # Open = not fulfilled and deadline still ahead; expired sweep keeps rows consistent.
        stmt = stmt.where(Request.status == "open", Request.needed_by > now)
    else:
        stmt = stmt.where(Request.status == status)

    rows = (await db.execute(stmt)).all()
    return [_request_out(row) for row in rows]


@router.post("", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: RequestCreate,
    user: User = Depends(get_current_user),
    _: None = Depends(post_rate_limiter),
    db: AsyncSession = Depends(get_db),
) -> RequestOut:
    if payload.needed_by <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="needed_by must be in the future")

    req = Request(
        user_id=user.id,
        type=payload.type,
        text=payload.text.strip(),
        location=f"SRID=4326;POINT({payload.lng} {payload.lat})",
        needed_by=payload.needed_by,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return _request_out((req, None, 0))


@router.get("/{request_id}", response_model=RequestDetailOut)
async def get_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> RequestDetailOut:
    req = await db.get(Request, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    reply_count = await db.scalar(
        select(func.count()).select_from(RequestReply).where(RequestReply.request_id == req.id)
    )
    replies = list(
        (
            await db.execute(
                select(RequestReply)
                .where(RequestReply.request_id == req.id)
                .order_by(RequestReply.created_at.asc())
            )
        ).scalars()
    )
    out = RequestDetailOut(
        id=req.id,
        user_id=req.user_id,
        author_name=req.author.full_name,
        type=req.type,  # type: ignore[arg-type]
        text=req.text,
        distance_m=None,
        needed_by=req.needed_by,
        status=req.status,  # type: ignore[arg-type]
        reply_count=reply_count or 0,
        created_at=req.created_at,
        replies=[
            ReplyOut(
                id=r.id,
                request_id=r.request_id,
                user_id=r.user_id,
                author_name=r.author.full_name,
                message=r.message,
                created_at=r.created_at,
            )
            for r in replies
        ],
    )
    return out


@router.post("/{request_id}/replies", response_model=ReplyOut, status_code=status.HTTP_201_CREATED)
async def create_reply(
    request_id: uuid.UUID,
    payload: ReplyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReplyOut:
    req = await db.get(Request, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != "open" or req.needed_by < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This request is closed")

    reply = RequestReply(request_id=req.id, user_id=user.id, message=payload.message.strip())
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    return ReplyOut(
        id=reply.id,
        request_id=reply.request_id,
        user_id=reply.user_id,
        author_name=user.full_name,
        message=reply.message,
        created_at=reply.created_at,
    )


@router.post("/{request_id}/fulfill", response_model=RequestDetailOut)
async def fulfill_request(
    request_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequestDetailOut:
    req = await db.get(Request, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the requester can mark this fulfilled")
    req.status = "fulfilled"
    await db.commit()
    return await get_request(request_id, db)


@router.post("/{request_id}/report", status_code=status.HTTP_201_CREATED)
async def report_request(
    request_id: uuid.UUID,
    payload: ReportCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    req = await db.get(Request, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    db.add(Report(reporter_id=user.id, target_type="request", target_id=req.id, reason=payload.reason.strip()))
    await db.commit()
    return {"ok": True}
