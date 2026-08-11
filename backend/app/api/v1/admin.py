"""Admin API — platform super-admin + community (RWA) dashboards (Phase 6).

Two access tiers:
  * admin          — whole-platform: KPIs, user management, all content
                     moderation, reports queue.
  * community      — locality-scoped dashboard: stats + recent posts for the
                     account's society, and moderation (resolve/delete) limited
                     to posts within its locality radius.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.directory import ProviderProfile, Review
from app.models.feed import FeedPost, Report
from app.models.requests import Request, RequestReply
from app.models.user import Locality, User
from app.schemas.admin import (
    AdminOverviewCounts,
    AdminOverviewOut,
    AdminPostOut,
    AdminProviderOut,
    AdminReportOut,
    AdminRequestOut,
    AdminUserOut,
    AdminUserUpdate,
    CategoryCount,
    CommunityOverviewOut,
    DailyCount,
)
from app.services.geo_engine import within_radius_expression

router = APIRouter()

# How far from a society's centroid its "local area" extends.
COMMUNITY_RADIUS_KM = 5.0


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def _post_out(post: FeedPost) -> AdminPostOut:
    return AdminPostOut(
        id=post.id,
        author_name=post.author.full_name,
        author_role=post.author.role,
        category=post.category,  # type: ignore[arg-type]
        text=post.text,
        confirm_count=post.confirm_count,
        resolved=post.resolved,
        urgent=post.urgent,
        created_at=post.created_at,
        expires_at=post.expires_at,
    )


async def _ensure_can_moderate_post(
    db: AsyncSession, post: FeedPost, user: User
) -> None:
    """Admins may moderate anything; community accounts only their locality."""
    if user.role == "admin":
        return
    if user.locality_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community accounts need a locality to moderate posts",
        )
    locality = await db.get(Locality, user.locality_id)
    if locality is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Locality not found"
        )
    inside = await db.scalar(
        select(
            within_radius_expression(
                FeedPost.location, locality.lat, locality.lng, COMMUNITY_RADIUS_KM * 1000
            )
        ).where(FeedPost.id == post.id)
    )
    if not inside:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This post is outside your society's area",
        )


def _user_out(u: User) -> AdminUserOut:
    return AdminUserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        role=u.role,  # type: ignore[arg-type]
        phone=u.phone,
        phone_verified=u.phone_verified,
        govt_id_verified=u.govt_id_verified,
        locality_name=u.locality.name if u.locality else None,
        created_at=u.created_at,
    )


def _local_area(locality: Locality) -> tuple[float, float, int]:
    return locality.lat, locality.lng, int(COMMUNITY_RADIUS_KM * 1000)


# --------------------------------------------------------------------------
# platform overview + user management (admin only)
# --------------------------------------------------------------------------
@router.get("/overview", response_model=AdminOverviewOut)
async def platform_overview(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminOverviewOut:
    now = datetime.now(timezone.utc)
    active_where = (FeedPost.expires_at > now) & (FeedPost.resolved.is_(False))

    counts = AdminOverviewCounts(
        users=await db.scalar(select(func.count()).select_from(User)) or 0,
        businesses=await db.scalar(
            select(func.count()).select_from(User).where(User.role == "business")
        )
        or 0,
        communities=await db.scalar(
            select(func.count()).select_from(User).where(User.role == "community")
        )
        or 0,
        feed_posts=await db.scalar(select(func.count()).select_from(FeedPost)) or 0,
        active_posts=await db.scalar(
            select(func.count()).select_from(FeedPost).where(active_where)
        )
        or 0,
        open_requests=await db.scalar(
            select(func.count()).select_from(Request).where(Request.status == "open")
        )
        or 0,
        providers=await db.scalar(select(func.count()).select_from(ProviderProfile))
        or 0,
        verified_providers=await db.scalar(
            select(func.count()).select_from(ProviderProfile).where(
                ProviderProfile.verified.is_(True)
            )
        )
        or 0,
        reviews=await db.scalar(select(func.count()).select_from(Review)) or 0,
        reports=await db.scalar(select(func.count()).select_from(Report)) or 0,
    )

    cat_rows = (
        await db.execute(
            select(FeedPost.category, func.count()).group_by(FeedPost.category)
        )
    ).all()
    posts_by_category = [
        CategoryCount(category=cat, count=cnt) for cat, cnt in cat_rows
    ]

    start = (now - timedelta(days=6)).date()
    day_rows = (
        await db.execute(
            select(
                func.to_char(User.created_at, "YYYY-MM-DD").label("day"),
                func.count(),
            )
            .where(User.created_at >= start)
            .group_by("day")
        )
    ).all()
    by_day = {day: cnt for day, cnt in day_rows}
    signups_last_7_days = [
        DailyCount(
            date=(start + timedelta(days=i)).isoformat(),
            count=by_day.get((start + timedelta(days=i)).isoformat(), 0),
        )
        for i in range(7)
    ]

    report_rows = (
        await db.execute(
            select(Report, User.full_name)
            .join(User, Report.reporter_id == User.id)
            .order_by(Report.created_at.desc())
            .limit(10)
        )
    ).all()
    recent_reports = [
        AdminReportOut(
            id=r.id,
            reporter_name=name,
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            created_at=r.created_at,
        )
        for r, name in report_rows
    ]

    return AdminOverviewOut(
        counts=counts,
        posts_by_category=posts_by_category,
        signups_last_7_days=signups_last_7_days,
        recent_reports=recent_reports,
    )


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    q: str | None = Query(default=None, max_length=80),
    role: str | None = Query(default=None),
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserOut]:
    stmt = select(User).order_by(User.created_at.desc()).limit(200)
    if q:
        stmt = stmt.where(
            or_(User.email.ilike(f"%{q}%"), User.full_name.ilike(f"%{q}%"))
        )
    if role:
        stmt = stmt.where(User.role == role)
    users = (await db.execute(stmt)).scalars().all()
    return [_user_out(u) for u in users]


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return _user_out(user)


# --------------------------------------------------------------------------
# moderation: feed posts (community accounts scoped to their locality)
# --------------------------------------------------------------------------
@router.get("/posts", response_model=list[AdminPostOut])
async def list_posts(
    category: str | None = Query(default=None),
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminPostOut]:
    stmt = select(FeedPost).order_by(FeedPost.created_at.desc()).limit(100)
    if category:
        stmt = stmt.where(FeedPost.category == category)
    posts = (await db.execute(stmt)).scalars().all()
    return [_post_out(p) for p in posts]


@router.post("/posts/{post_id}/resolve", response_model=AdminPostOut)
async def resolve_post(
    post_id: uuid.UUID,
    user: User = Depends(require_role("community", "admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminPostOut:
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    await _ensure_can_moderate_post(db, post, user)
    post.resolved = True
    post.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(post)
    return _post_out(post)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    user: User = Depends(require_role("community", "admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    post = await db.get(FeedPost, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    await _ensure_can_moderate_post(db, post, user)
    await db.delete(post)
    await db.commit()


# --------------------------------------------------------------------------
# moderation: requests / providers / reports (admin only)
# --------------------------------------------------------------------------
@router.get("/requests", response_model=list[AdminRequestOut])
async def list_requests(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminRequestOut]:
    rows = (
        await db.execute(
            select(Request).order_by(Request.created_at.desc()).limit(100)
        )
    ).scalars()
    requests = list(rows)
    reply_rows = (
        await db.execute(
            select(RequestReply.request_id, func.count()).group_by(
                RequestReply.request_id
            )
        )
    ).all()
    reply_counts = dict(reply_rows)
    return [
        AdminRequestOut(
            id=req.id,
            author_name=req.author.full_name,
            type=req.type,  # type: ignore[arg-type]
            text=req.text,
            status=req.status,
            reply_count=reply_counts.get(req.id, 0),
            needed_by=req.needed_by,
            created_at=req.created_at,
        )
        for req in requests
    ]


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_request(
    request_id: uuid.UUID,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    req = await db.get(Request, request_id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
        )
    await db.delete(req)
    await db.commit()


@router.get("/providers", response_model=list[AdminProviderOut])
async def list_providers(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminProviderOut]:
    providers = (
        await db.execute(
            select(ProviderProfile)
            .order_by(ProviderProfile.created_at.desc())
            .limit(100)
        )
    ).scalars()
    provider_list = list(providers)
    agg_rows = (
        await db.execute(
            select(
                Review.provider_id,
                func.count(Review.id),
                func.avg(Review.rating),
            ).group_by(Review.provider_id)
        )
    ).all()
    agg_by_provider = {
        provider_id: (review_count or 0, float(avg_rating or 0))
        for provider_id, review_count, avg_rating in agg_rows
    }
    return [
        AdminProviderOut(
            id=p.id,
            display_name=p.user.full_name,
            category=p.category,
            tagline=p.tagline,
            verified=p.verified,
            verification_count=p.verification_count,
            review_count=agg_by_provider.get(p.id, (0, 0.0))[0],
            avg_rating=agg_by_provider.get(p.id, (0, 0.0))[1],
            created_at=p.created_at,
        )
        for p in provider_list
    ]


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: uuid.UUID,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    provider = await db.get(ProviderProfile, provider_id)
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found"
        )
    await db.delete(provider)
    await db.commit()


@router.get("/reports", response_model=list[AdminReportOut])
async def list_reports(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[AdminReportOut]:
    rows = (
        await db.execute(
            select(Report, User.full_name)
            .join(User, Report.reporter_id == User.id)
            .order_by(Report.created_at.desc())
            .limit(100)
        )
    ).all()
    return [
        AdminReportOut(
            id=r.id,
            reporter_name=name,
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            created_at=r.created_at,
        )
        for r, name in rows
    ]


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_report(
    report_id: uuid.UUID,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    await db.delete(report)
    await db.commit()


# --------------------------------------------------------------------------
# community (RWA) dashboard — locality-scoped stats + moderation
# --------------------------------------------------------------------------
@router.get("/community/overview", response_model=CommunityOverviewOut)
async def community_overview(
    user: User = Depends(require_role("community", "admin")),
    db: AsyncSession = Depends(get_db),
) -> CommunityOverviewOut:
    if user.locality_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your community account has no locality assigned",
        )
    locality = await db.get(Locality, user.locality_id)
    if locality is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Locality not found"
        )
    lat, lng, radius_m = _local_area(locality)
    now = datetime.now(timezone.utc)

    in_area = within_radius_expression(FeedPost.location, lat, lng, radius_m)
    post_count = (
        await db.scalar(select(func.count()).select_from(FeedPost).where(in_area))
    ) or 0
    active_post_count = (
        await db.scalar(
            select(func.count())
            .select_from(FeedPost)
            .where(in_area, FeedPost.expires_at > now, FeedPost.resolved.is_(False))
        )
    ) or 0
    request_count = (
        await db.scalar(
            select(func.count())
            .select_from(Request)
            .where(
                within_radius_expression(Request.location, lat, lng, radius_m),
                Request.status == "open",
            )
        )
    ) or 0
    provider_count = (
        await db.scalar(
            select(func.count())
            .select_from(ProviderProfile)
            .where(
                within_radius_expression(ProviderProfile.location, lat, lng, radius_m)
            )
        )
    ) or 0

    cat_rows = (
        await db.execute(
            select(FeedPost.category, func.count())
            .where(in_area)
            .group_by(FeedPost.category)
        )
    ).all()
    posts_by_category = [
        CategoryCount(category=cat, count=cnt) for cat, cnt in cat_rows
    ]

    recent = (
        await db.execute(
            select(FeedPost).where(in_area).order_by(FeedPost.created_at.desc()).limit(20)
        )
    ).scalars()
    recent_posts = [_post_out(p) for p in recent]

    return CommunityOverviewOut(
        locality_name=locality.name,
        post_count=post_count,
        active_post_count=active_post_count,
        request_count=request_count,
        provider_count=provider_count,
        posts_by_category=posts_by_category,
        recent_posts=recent_posts,
    )
