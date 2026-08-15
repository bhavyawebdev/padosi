"""Current-user endpoints + activity feed for the profile page (Phase 1/5)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.auth_security import UserSession
from app.models.directory import ProviderProfile, Review
from app.models.feed import FeedPost
from app.models.requests import Request, RequestReply
from app.models.user import User
from app.models.feed import FeedPostConfirm
from app.schemas.user import ActivityItem, ActivityOut, NotificationOut, SessionOut, UserOut, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me/activity", response_model=ActivityOut)
async def my_activity(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActivityOut:
    """Counts + recent activity, powering the profile page (screen 05)."""
    posts_count = await db.scalar(select(func.count()).select_from(FeedPost).where(FeedPost.user_id == user.id)) or 0
    requests_count = await db.scalar(select(func.count()).select_from(Request).where(Request.user_id == user.id)) or 0
    reviews_count = await db.scalar(select(func.count()).select_from(Review).where(Review.reviewer_id == user.id)) or 0
    replies_count = await db.scalar(select(func.count()).select_from(RequestReply).where(RequestReply.user_id == user.id)) or 0

    items: list[ActivityItem] = []

    posts = list(
        (await db.execute(select(FeedPost).where(FeedPost.user_id == user.id).order_by(FeedPost.created_at.desc()).limit(10))).scalars()
    )
    for post in posts:
        items.append(
            ActivityItem(type="post", title=post.category, detail=post.text[:160], created_at=post.created_at)
        )

    requests = list(
        (await db.execute(select(Request).where(Request.user_id == user.id).order_by(Request.created_at.desc()).limit(10))).scalars()
    )
    for req in requests:
        items.append(
            ActivityItem(type="request", title=req.type, detail=req.text[:160], created_at=req.created_at)
        )

    reviews = list(
        (
            await db.execute(
                select(Review)
                .options(selectinload(Review.provider).selectinload(ProviderProfile.user))
                .where(Review.reviewer_id == user.id)
                .order_by(Review.created_at.desc())
                .limit(10)
            )
        ).scalars()
    )
    for review in reviews:
        provider_name = review.provider.user.full_name if review.provider and review.provider.user else "a provider"
        items.append(
            ActivityItem(
                type="review",
                title=f"Reviewed {provider_name}",
                detail=review.text[:160],
                created_at=review.created_at,
            )
        )

    replies = list(
        (
            await db.execute(
                select(RequestReply)
                .where(RequestReply.user_id == user.id)
                .order_by(RequestReply.created_at.desc())
                .limit(10)
            )
        ).scalars()
    )
    for reply in replies:
        items.append(
            ActivityItem(type="reply", title="Replied to a request", detail=reply.message[:160], created_at=reply.created_at)
        )

    items.sort(key=lambda item: item.created_at, reverse=True)
    return ActivityOut(
        posts_count=posts_count,
        requests_count=requests_count,
        reviews_count=reviews_count,
        replies_count=replies_count,
        items=items[:12],
    )


@router.get("/me/sessions", response_model=list[SessionOut])
async def my_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserSession]:
    """Recent sign-ins (newest first) for the "Sessions & security" audit.
    The frontend marks its own login by comparing against the session_id
    returned at login time."""
    return list(
        (
            await db.execute(
                select(UserSession)
                .where(UserSession.user_id == user.id)
                .order_by(UserSession.created_at.desc())
                .limit(10)
            )
        ).scalars()
    )


@router.get("/me/notifications", response_model=list[NotificationOut])
async def my_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationOut]:
    """Neighbor actions that involve me: replies to my requests, confirms on
    my posts, reviews on my provider profile. Newest first, max 20."""
    items: list[NotificationOut] = []

    reply_rows = (
        await db.execute(
            select(RequestReply, Request)
            .join(Request, RequestReply.request_id == Request.id)
            .where(Request.user_id == user.id, RequestReply.user_id != user.id)
            .order_by(RequestReply.created_at.desc())
            .limit(10)
        )
    ).all()
    for reply, req in reply_rows:
        items.append(
            NotificationOut(
                id=f"reply:{reply.id}",
                type="reply",
                title=f"{reply.author.full_name} replied to your request",
                detail=reply.message[:160],
                created_at=reply.created_at,
                target_type="request",
                target_id=req.id,
            )
        )

    confirm_rows = (
        await db.execute(
            select(FeedPostConfirm, FeedPost)
            .join(FeedPost, FeedPostConfirm.post_id == FeedPost.id)
            .where(FeedPost.user_id == user.id, FeedPostConfirm.user_id != user.id)
            .order_by(FeedPostConfirm.created_at.desc())
            .limit(10)
        )
    ).all()
    for confirm, post in confirm_rows:
        items.append(
            NotificationOut(
                id=f"confirm:{confirm.id}",
                type="confirm",
                title="A neighbor confirmed your post",
                detail=post.text[:160],
                created_at=confirm.created_at,
                target_type="post",
                target_id=post.id,
            )
        )

    profile_ids = select(ProviderProfile.id).where(ProviderProfile.user_id == user.id)
    reviews = (
        await db.execute(
            select(Review)
            .where(Review.provider_id.in_(profile_ids))
            .order_by(Review.created_at.desc())
            .limit(10)
        )
    ).scalars()
    for review in reviews:
        items.append(
            NotificationOut(
                id=f"review:{review.id}",
                type="review",
                title=f"{review.reviewer.full_name} reviewed your service",
                detail=review.text[:160],
                created_at=review.created_at,
                target_type="provider",
                target_id=review.provider_id,
            )
        )

    items.sort(key=lambda item: item.created_at, reverse=True)
    return items[:20]
