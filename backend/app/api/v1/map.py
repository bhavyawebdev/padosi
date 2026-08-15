"""Map view — a single endpoint aggregating all three feature types as
geo markers, so the map page needs exactly one query (not three list calls
that don't carry lat/lng)."""
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from geoalchemy2 import Geometry
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_optional_user
from app.db.session import get_db
from app.models.directory import ProviderProfile, Review
from app.models.feed import FeedPost
from app.models.requests import Request
from app.models.user import User
from app.services.geo_engine import distance_expression, within_radius_expression

router = APIRouter()

DEFAULT_MAP_RADIUS_KM = 5.0

# Columns are stored as PostGIS `geography`; ST_Y/ST_X don't exist for
# geography, so cast to geometry first (same 4326 lon/lat coordinates).
_GEOMETRY_POINT = Geometry(geometry_type="POINT", srid=4326)


def _lat_lng(column):
    """(latitude, longitude) select expressions for a geography column."""
    geom = column.cast(_GEOMETRY_POINT)
    return func.ST_Y(geom).label("lat"), func.ST_X(geom).label("lng")


class MapMarker(BaseModel):
    id: uuid.UUID
    kind: Literal["post", "request", "provider"]
    category: str
    title: str
    lat: float
    lng: float
    distance_m: float | None
    meta: str | None
    href: str


@router.get("/markers", response_model=list[MapMarker])
async def map_markers(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=DEFAULT_MAP_RADIUS_KM, ge=0.5, le=50),
    _: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[MapMarker]:
    radius_m = radius_km * 1000
    now = datetime.now(timezone.utc)
    markers: list[MapMarker] = []

    lat_exp, lng_exp = _lat_lng(FeedPost.location)
    posts = (
        await db.execute(
            select(
                FeedPost,
                lat_exp,
                lng_exp,
                distance_expression(FeedPost.location, lat, lng),
            )
            .where(
                within_radius_expression(FeedPost.location, lat, lng, radius_m),
                FeedPost.expires_at > now,
                FeedPost.resolved.is_(False),
            )
            .order_by(FeedPost.created_at.desc())
            .limit(100)
        )
    ).all()
    for post, pl_lat, pl_lng, dist in posts:
        markers.append(
            MapMarker(
                id=post.id,
                kind="post",
                category=post.category,
                title=post.text,
                lat=float(pl_lat),
                lng=float(pl_lng),
                distance_m=round(dist) if dist is not None else None,
                meta=f"expires {post.expires_at.strftime('%H:%M')}",
                href=f"/posts/{post.id}",
            )
        )

    req_lat, req_lng = _lat_lng(Request.location)
    requests = (
        await db.execute(
            select(
                Request,
                req_lat,
                req_lng,
                distance_expression(Request.location, lat, lng),
            )
            .where(
                within_radius_expression(Request.location, lat, lng, radius_m),
                Request.status == "open",
                Request.needed_by > now,
            )
            .order_by(Request.needed_by.asc())
            .limit(100)
        )
    ).all()
    for req, r_lat, r_lng, dist in requests:
        markers.append(
            MapMarker(
                id=req.id,
                kind="request",
                category=req.type,
                title=req.text,
                lat=float(r_lat),
                lng=float(r_lng),
                distance_m=round(dist) if dist is not None else None,
                meta=f"needed by {req.needed_by.strftime('%d %b %H:%M')}",
                href=f"/requests/{req.id}",
            )
        )

    prov_lat, prov_lng = _lat_lng(ProviderProfile.location)
    review_counts = (
        select(Review.provider_id, func.count().label("rc"))
        .group_by(Review.provider_id)
        .subquery()
    )
    providers = (
        await db.execute(
            select(
                ProviderProfile,
                prov_lat,
                prov_lng,
                distance_expression(ProviderProfile.location, lat, lng),
                review_counts.c.rc,
            )
            .outerjoin(review_counts, review_counts.c.provider_id == ProviderProfile.id)
            .where(within_radius_expression(ProviderProfile.location, lat, lng, radius_m))
            .order_by(distance_expression(ProviderProfile.location, lat, lng).asc())
            .limit(100)
        )
    ).all()
    for profile, p_lat, p_lng, dist, rc in providers:
        markers.append(
            MapMarker(
                id=profile.id,
                kind="provider",
                category=profile.category,
                title=profile.tagline,
                lat=float(p_lat),
                lng=float(p_lng),
                distance_m=round(dist) if dist is not None else None,
                meta=f"Verified by {profile.verification_count}" if profile.verified else f"{rc or 0} review(s)",
                href=f"/providers/{profile.id}",
            )
        )

    return markers
