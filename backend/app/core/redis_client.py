"""Redis accessor with a deliberate dev fallback.

The app is Redis-backed in production (rate limiting, WS pub/sub, Celery
broker). In development, if Redis is unreachable we degrade gracefully to
in-memory equivalents so the platform still runs — a decision confirmed with
the user. No code changes are needed once Redis is available; it is picked up
automatically.
"""
import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: aioredis.Redis | None = None
_unavailable: bool = False


def get_redis() -> aioredis.Redis | None:
    """Return the shared Redis client, or None if Redis is unreachable.

    The client is created lazily; connectivity is verified on first use via
    ``redis_available`` so a down Redis never raises in hot paths.
    """
    global _client, _unavailable
    if _client is None and not _unavailable:
        try:
            _client = aioredis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=0.5,
                socket_timeout=1.0,
                decode_responses=True,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Redis client init failed (%s); using in-memory fallbacks.", exc)
            _unavailable = True
            return None
    return _client


async def redis_available() -> bool:
    """Ping Redis once; on failure mark unavailable and return False."""
    global _unavailable
    if _unavailable:
        return False
    client = get_redis()
    if client is None:
        return False
    try:
        await client.ping()
        return True
    except Exception:
        _unavailable = True
        logger.warning("Redis unreachable — using in-memory fallbacks (dev mode).")
        return False
