"""Nearby Right Now — live hyperlocal feed endpoints (Phase 2)."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_optional_user
from app.core.rate_limit import post_rate_limiter
from app.db.session import get_db
from app.models.feed import FeedPost, FeedPostConfirm, Report
from app.models.user import User
from app.schemas.feed import FeedPostOut, PostCreate, ReportCreate
from app.services.events import publish_feed_event
from app.services.geo_engine import distance_expression, within_radius_expression

router = APIRouter()

DEFAULT_CATEGORY = "traffic"


def _expires_at_for(category: str) -> datetime:
    hours = settings.FEED_EXPIRY_HOURS_BY_CATEGORY.get(category, settings.FEED_EXPIRY_HOURS_DEFAULT)
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def _to_out(post: FeedPost, distance_m: float | None, confirmed_by_me: bool) -> FeedPostOut:
    return FeedPostOut(
        id=post.id,
        user_id=post.user_id,
        author_name=post.author.full_name,
        author_role=post.author.role,
        category=post.category,  # type: ignore[arg-type]
        text=post.text,
        distance_m=distance_m,
        created_at=post.created_at,
        expires_at=post.expires_at,
        confirm_count=post.confirm_count,
        confirmed_by_me=confirmed_by_me,
        resolved=post.resolved,
        urgent=post.urgent,
    )


@router.get("", response_model=list[FeedPostOut])
async def list_feed(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_km: float | None = Query(default=None, ge=0.1, le=50),
    category: Literal["traffic", "civic", "safety", "utility", "event", "other"] | None = None,
    q: str | None = Query(default=None, max_length=120),
    include_resolved: bool = False,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[FeedPostOut]:
    radius_m = (radius_km or settings.DEFAULT_RADIUS_KM) * 1000
    now = datetime.now(timezone.utc)

    dist = distance_expression(FeedPost.location, lat, lng)
    stmt = (
        select(FeedPost, dist, FeedPostConfirm.id.isnot(None).label("confirmed_by_me"))
        .outerjoin(
            FeedPostConfirm,
            and_(FeedPostConfirm.post_id == FeedPost.id, FeedPostConfirm.user_id == user.id if user else None),
        )
        .where(within_radius_expression(FeedPost.location, lat, lng, radius_m))
        .where(FeedPost.expires_at > now)
        .order_by(FeedPost.created_at.desc(), dist.asc())
    )
    if category:
        stmt = stmt.where(FeedPost.category == category)
    if q:
        stmt = stmt.where(FeedPost.text.ilike(f"%{q.strip()}%"))
    if not include_resolved:
        stmt = stmt.where(FeedPost.resolved.is_(False))

    rows = (await db.execute(stmt)).all()
    return [_to_out(post, distance_m, bool(confirmed_by_me)) for post, distance_m, confirmed_by_me in rows]


@router.get("/{post_id}", response_model=FeedPostOut)
async def get_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> FeedPostOut:
    """Single post — powers the post detail view (Phase 6)."""
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return _to_out(post, None, False)


@router.post("", response_model=FeedPostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    user: User = Depends(get_current_user),
    _: None = Depends(post_rate_limiter),
    db: AsyncSession = Depends(get_db),
) -> FeedPostOut:
    post = FeedPost(
        user_id=user.id,
        category=payload.category,
        text=payload.text.strip(),
        location=f"SRID=4326;POINT({payload.lng} {payload.lat})",
        expires_at=_expires_at_for(payload.category),
        urgent=payload.urgent,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    await publish_feed_event(
        {"type": "feed.post_created", "post_id": str(post.id), "created_at": post.created_at.isoformat()}
    )
    return _to_out(post, None, False)


@router.post("/{post_id}/confirm", response_model=FeedPostOut)
async def confirm_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedPostOut:
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.expires_at < datetime.now(timezone.utc) or post.resolved:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This post has expired or been resolved")

    already = await db.scalar(
        select(FeedPostConfirm).where(
            FeedPostConfirm.post_id == post.id, FeedPostConfirm.user_id == user.id
        )
    )
    if already is None:
        db.add(FeedPostConfirm(post_id=post.id, user_id=user.id))
        post.confirm_count += 1
        await db.commit()
        await db.refresh(post)
    return _to_out(post, None, True)


@router.post("/{post_id}/resolve", response_model=FeedPostOut)
async def resolve_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedPostOut:
    """Author (or a community role) marks the situation resolved — the post
    drops off the feed (auto-expires faster, per spec)."""
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.user_id != user.id and user.role != "community":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can resolve this post")
    post.resolved = True
    post.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(post)
    return _to_out(post, None, False)


@router.post("/{post_id}/report", status_code=status.HTTP_201_CREATED)
async def report_post(
    post_id: uuid.UUID,
    payload: ReportCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    db.add(Report(reporter_id=user.id, target_type="feed", target_id=post.id, reason=payload.reason.strip()))
    await db.commit()
    return {"ok": True}


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can delete this post")
    await db.delete(post)
    await db.commit()
