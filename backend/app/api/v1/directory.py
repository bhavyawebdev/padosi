"""Verified Help — trusted local directory endpoints (Phase 3)."""
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.rate_limit import post_rate_limiter
from app.db.session import get_db
from app.models.directory import ProviderProfile, Review
from app.models.feed import Report
from app.models.messages import BookingRequest, Conversation
from app.models.user import User
from app.schemas.directory import (
    ProviderCreate,
    ProviderDetailOut,
    ProviderOut,
    ProviderUpdate,
    ReviewCreate,
    ReviewOut,
)
from app.schemas.feed import ReportCreate
from app.schemas.messages import BookingCreate, BookingOut, BookingRespond
from app.services.geo_engine import distance_expression, within_radius_expression
from app.services.verification import recompute_verification

router = APIRouter()

DEFAULT_DIRECTORY_RADIUS_KM = 10.0


def _reviews_subquery():
    return (
        select(
            Review.provider_id,
            func.count().label("review_count"),
            func.avg(Review.rating).label("avg_rating"),
        )
        .group_by(Review.provider_id)
        .subquery()
    )


def _to_out(profile: ProviderProfile, distance_m, review_count, avg_rating) -> ProviderOut:
    return ProviderOut(
        id=profile.id,
        user_id=profile.user_id,
        display_name=profile.user.full_name,
        category=profile.category,  # type: ignore[arg-type]
        tagline=profile.tagline,
        price_range=profile.price_range,
        availability=profile.availability,
        service_area_km=profile.service_area_km,
        verified=profile.verified,
        verification_count=profile.verification_count,
        review_count=review_count or 0,
        avg_rating=round(avg_rating, 1) if avg_rating is not None else None,
        distance_m=distance_m,
    )


@router.get("", response_model=list[ProviderOut])
async def list_providers(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_km: float | None = Query(default=None, ge=0.5, le=50),
    category: Literal["cook", "maid", "tutor", "plumber", "electrician", "dog_walker", "other"] | None = None,
    verified_only: bool = False,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[ProviderOut]:
    radius_m = (radius_km or DEFAULT_DIRECTORY_RADIUS_KM) * 1000
    reviews = _reviews_subquery()
    dist = distance_expression(ProviderProfile.location, lat, lng)

    stmt = (
        select(ProviderProfile, dist, reviews.c.review_count, reviews.c.avg_rating)
        .outerjoin(reviews, reviews.c.provider_id == ProviderProfile.id)
        .where(within_radius_expression(ProviderProfile.location, lat, lng, radius_m))
        .order_by(ProviderProfile.verified.desc(), dist.asc())
    )
    if category:
        stmt = stmt.where(ProviderProfile.category == category)
    if verified_only:
        stmt = stmt.where(ProviderProfile.verified.is_(True))
    if q:
        like = f"%{q.lower()}%"
        name_matches = select(User.id).where(func.lower(User.full_name).like(like)).exists()
        stmt = stmt.where(func.lower(ProviderProfile.tagline).like(like) | name_matches)

    rows = (await db.execute(stmt)).all()
    return [_to_out(profile, distance_m, review_count, avg_rating) for profile, distance_m, review_count, avg_rating in rows]


@router.post("", response_model=ProviderOut, status_code=status.HTTP_201_CREATED)
async def create_provider(
    payload: ProviderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProviderOut:
    existing = await db.scalar(select(ProviderProfile).where(ProviderProfile.user_id == user.id))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have a provider profile")

    profile = ProviderProfile(
        user_id=user.id,
        category=payload.category,
        tagline=payload.tagline.strip(),
        price_range=payload.price_range,
        availability=payload.availability,
        service_area_km=payload.service_area_km,
        location=f"SRID=4326;POINT({payload.lng} {payload.lat})",
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return _to_out(profile, None, 0, None)


# --- Service booking / contact requests -------------------------------------
# NOTE: declared before "/{provider_id}" routes so "/bookings" is never
# captured as a provider id.

def _booking_out(booking: BookingRequest, direction: str) -> BookingOut:
    return BookingOut(
        id=booking.id,
        provider_id=booking.provider_id,
        provider_name=booking.provider.user.full_name,
        provider_category=booking.provider.category,  # type: ignore[arg-type]
        customer_id=booking.customer_id,
        customer_name=booking.customer.full_name,
        message=booking.message,
        status=booking.status,  # type: ignore[arg-type]
        reply=booking.reply,
        direction=direction,  # type: ignore[arg-type]
        created_at=booking.created_at,
    )


@router.get("/bookings", response_model=list[BookingOut])
async def my_bookings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BookingOut]:
    """All booking requests involving me: incoming (my provider profile)
    and outgoing (I asked a provider). Newest first."""
    out: list[BookingOut] = []
    profile = await db.scalar(select(ProviderProfile).where(ProviderProfile.user_id == user.id))
    if profile is not None:
        incoming = (
            await db.execute(
                select(BookingRequest)
                .where(BookingRequest.provider_id == profile.id)
                .order_by(BookingRequest.created_at.desc())
            )
        ).scalars()
        out.extend(_booking_out(b, "incoming") for b in incoming)

    outgoing = (
        await db.execute(
            select(BookingRequest)
            .where(BookingRequest.customer_id == user.id)
            .order_by(BookingRequest.created_at.desc())
        )
    ).scalars()
    out.extend(_booking_out(b, "outgoing") for b in outgoing)

    out.sort(key=lambda b: b.created_at, reverse=True)
    return out


@router.post("/{provider_id}/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    provider_id: uuid.UUID,
    payload: BookingCreate,
    user: User = Depends(get_current_user),
    _: None = Depends(post_rate_limiter),
    db: AsyncSession = Depends(get_db),
) -> BookingOut:
    profile = await db.get(ProviderProfile, provider_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    if profile.user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't book your own service")

    booking = BookingRequest(provider_id=profile.id, customer_id=user.id, message=payload.message.strip())
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return _booking_out(booking, "outgoing")


@router.post("/bookings/{booking_id}/respond", response_model=BookingOut)
async def respond_booking(
    booking_id: uuid.UUID,
    payload: BookingRespond,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingOut:
    booking = await db.get(BookingRequest, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking request not found")
    profile = await db.get(ProviderProfile, booking.provider_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the provider can respond")
    if booking.status != "new":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request was already answered")

    booking.status = payload.status
    booking.reply = payload.reply.strip() if payload.reply else None

    # Accepting opens a 1:1 conversation so the two neighbours can coordinate.
    if payload.status == "accepted":
        a, b = (booking.customer_id, user.id) if str(booking.customer_id) < str(user.id) else (user.id, booking.customer_id)
        existing = await db.scalar(
            select(Conversation).where(Conversation.user_a_id == a, Conversation.user_b_id == b)
        )
        if existing is None:
            db.add(Conversation(user_a_id=a, user_b_id=b))

    await db.commit()
    await db.refresh(booking)
    return _booking_out(booking, "incoming")


@router.get("/{provider_id}", response_model=ProviderDetailOut)
async def get_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProviderDetailOut:
    profile = await db.get(ProviderProfile, provider_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    review_count, avg_rating = (
        await db.execute(
            select(func.count(), func.avg(Review.rating)).where(Review.provider_id == provider_id)
        )
    ).one()

    reviews = list(
        (
            await db.execute(
                select(Review).where(Review.provider_id == provider_id).order_by(Review.created_at.desc())
            )
        ).scalars()
    )
    out = _to_out(profile, None, review_count, avg_rating)
    detail = ProviderDetailOut.model_validate(
        out.model_dump()
        | {
            "reviews": [
                ReviewOut(
                    id=r.id,
                    provider_id=r.provider_id,
                    reviewer_id=r.reviewer_id,
                    reviewer_name=r.reviewer.full_name,
                    rating=r.rating,
                    text=r.text,
                    created_at=r.created_at,
                )
                for r in reviews
            ]
        }
    )
    return detail


@router.patch("/{provider_id}", response_model=ProviderOut)
async def update_provider(
    provider_id: uuid.UUID,
    payload: ProviderUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProviderOut:
    profile = await db.get(ProviderProfile, provider_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    if profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can edit this profile")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    review_count, avg_rating = (
        await db.execute(
            select(func.count(), func.avg(Review.rating)).where(Review.provider_id == provider_id)
        )
    ).one()
    return _to_out(profile, None, review_count, avg_rating)


@router.post("/{provider_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    provider_id: uuid.UUID,
    payload: ReviewCreate,
    user: User = Depends(get_current_user),
    _: None = Depends(post_rate_limiter),
    db: AsyncSession = Depends(get_db),
) -> ReviewOut:
    profile = await db.get(ProviderProfile, provider_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    if profile.user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot review your own profile")

    review = Review(
        provider_id=provider_id,
        reviewer_id=user.id,
        rating=payload.rating,
        text=payload.text.strip(),
    )
    db.add(review)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this provider")

    await recompute_verification(db, provider_id)
    await db.commit()
    await db.refresh(review)
    return ReviewOut(
        id=review.id,
        provider_id=review.provider_id,
        reviewer_id=review.reviewer_id,
        reviewer_name=user.full_name,
        rating=review.rating,
        text=review.text,
        created_at=review.created_at,
    )


@router.post("/{provider_id}/report", status_code=status.HTTP_201_CREATED)
async def report_provider(
    provider_id: uuid.UUID,
    payload: ReportCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = await db.get(ProviderProfile, provider_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    db.add(Report(reporter_id=user.id, target_type="provider", target_id=profile.id, reason=payload.reason.strip()))
    await db.commit()
    return {"ok": True}
