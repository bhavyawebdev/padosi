"""Community-driven verification (Verified Help).

A provider becomes verified once they have VERIFIED_REVIEW_THRESHOLD text
reviews — "Verified by N neighbors", not a star average. This is the single
implementation of that rule, shared by the review endpoint and the Celery
recalc task.
"""
import logging
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.directory import ProviderProfile, Review

logger = logging.getLogger(__name__)


async def recompute_verification(db: AsyncSession, provider_id: uuid.UUID) -> None:
    """Recount text reviews for a provider and refresh verified flag."""
    count = await db.scalar(
        select(func.count())
        .select_from(Review)
        .where(Review.provider_id == provider_id, Review.text != "")
    )
    count = count or 0
    verified = count >= settings.VERIFIED_REVIEW_THRESHOLD
    await db.execute(
        update(ProviderProfile)
        .where(ProviderProfile.id == provider_id)
        .values(verification_count=count, verified=verified)
    )
    if verified:
        logger.info("Provider %s now verified with %s neighbor reviews", provider_id, count)
