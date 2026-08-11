"""Celery background tasks.

- expire_requests: flips open "Need It Now" requests to expired once their
  needed_by deadline has passed (visibility is also filtered at query time).
- purge_expired_feed_posts: deletes feed posts older than a week past expiry
  so the "pulse" stays short-lived (query filtering already hides them).
- recalc_verifications: recomputes provider verification counts from text
  reviews (community-driven trust, not star averages).
- dispatch_notifications: stub for future push/email dispatch.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update

from app.db.session import async_session_factory
from app.models.directory import ProviderProfile
from app.models.feed import FeedPost
from app.models.requests import Request
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task
def expire_requests() -> int:
    """Mark open requests past their needed_by deadline as expired."""
    async def _run() -> int:
        async with async_session_factory() as db:
            result = await db.execute(
                update(Request)
                .where(Request.status == "open", Request.needed_by < datetime.now(timezone.utc))
                .values(status="expired")
            )
            await db.commit()
            return result.rowcount or 0

    import asyncio

    count = asyncio.run(_run())
    logger.info("Expired %s requests", count)
    return count


@celery_app.task
def purge_expired_feed_posts() -> int:
    """Delete feed posts more than 7 days past their expiry (keeps the DB lean)."""
    async def _run() -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        async with async_session_factory() as db:
            result = await db.execute(delete(FeedPost).where(FeedPost.expires_at < cutoff))
            await db.commit()
            return result.rowcount or 0

    import asyncio

    count = asyncio.run(_run())
    logger.info("Purged %s stale feed posts", count)
    return count


@celery_app.task
def recalc_verifications() -> int:
    """Rebuild verification_count from text reviews and refresh verified flag."""
    from sqlalchemy import func

    async def _run() -> int:
        async with async_session_factory() as db:
            # One subquery for text-review counts per provider.
            from app.models.directory import Review

            sub = (
                select(Review.provider_id, func.count().label("cnt"))
                .where(Review.text != "")
                .group_by(Review.provider_id)
                .subquery()
            )
            rows = (
                select(ProviderProfile.id, sub.c.cnt)
                .outerjoin(sub, sub.c.provider_id == ProviderProfile.id)
            )
            updated = 0
            for profile_id, cnt in (await db.execute(rows)).all():
                count = cnt or 0
                verified = count >= 3  # threshold applied centrally in the service too
                await db.execute(
                    update(ProviderProfile)
                    .where(ProviderProfile.id == profile_id)
                    .values(verification_count=count, verified=verified)
                )
                updated += 1
            await db.commit()
            return updated

    import asyncio

    count = asyncio.run(_run())
    logger.info("Recalculated verification for %s providers", count)
    return count


@celery_app.task
def dispatch_notifications() -> None:
    """Notification dispatch stub — wire real push/email here in a later phase."""
    logger.info("Notification dispatch run (no-op)")
