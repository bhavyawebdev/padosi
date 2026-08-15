"""Redis-backed rate limiting with an in-memory fallback for dev.

Keyed on the authenticated user id (when present) else the client host, so a
logged-in user's post budget is per-user rather than per-IP.
"""
import logging
import time
import uuid
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)


class RateLimiter:
    """Sliding-window limiter. Redis-backed; falls back to per-process memory."""

    def __init__(self, limit: int, window_seconds: int, prefix: str) -> None:
        self.limit = limit
        self.window = window_seconds
        self.prefix = prefix
        self._memory: dict[str, deque[float]] = defaultdict(deque)

    def _key_for(self, request: Request) -> str:
        user = getattr(request.state, "user", None)
        identity = str(getattr(user, "id", "")) if user else request.client.host if request.client else "unknown"
        return f"rl:{self.prefix}:{identity}"

    async def _check_memory(self, key: str) -> None:
        now = time.monotonic()
        bucket = self._memory[key]
        while bucket and bucket[0] < now - self.window:
            bucket.popleft()
        if len(bucket) >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in a bit (limit: {self.limit} per {self.window // 60} min).",
            )
        bucket.append(now)

    async def __call__(self, request: Request) -> None:
        key = self._key_for(request)
        client = get_redis()
        if client is not None:
            try:
                now = time.time()
                zkey = f"{key}:z"
                member = f"{now}-{uuid.uuid4().hex}"
                pipe = client.pipeline()
                pipe.zremrangebyscore(zkey, 0, now - self.window)
                pipe.zadd(zkey, {member: now})
                pipe.zcard(zkey)
                pipe.expire(zkey, self.window)
                _removed, _added, count, _expire = await pipe.execute()
                if count > self.limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests. Try again in a bit (limit: {self.limit} per {self.window // 60} min).",
                    )
                return
            except HTTPException:
                raise
            except Exception as exc:  # Redis hiccup -> fall back to memory for this call
                logger.debug("Redis rate-limit failure, using memory fallback: %s", exc)
        await self._check_memory(key)


# Shared instances for post/request creation (spam control on a hyperlocal feed).
post_rate_limiter = RateLimiter(
    limit=settings.POST_RATE_LIMIT_PER_HOUR,
    window_seconds=3600,
    prefix="post",
)

# Generic login throttle per identity (per-IP for anonymous): guards against
# scripted brute-force. Per-email lockout after repeated failures is handled
# separately by FailedLoginTracker (core/security.py).
login_rate_limiter = RateLimiter(limit=20, window_seconds=300, prefix="login")
