"""Password hashing (bcrypt), JWT creation/validation, and login lockout.

bcrypt is used directly rather than passlib because passlib is effectively
unmaintained and has known incompatibilities with bcrypt>=4.1.

The JWT carries a `ver` claim (the user's token_version). Bumping the stored
version — on logout, password change, or reset — instantly invalidates every
previously issued token, which gives real server-side "sign out everywhere".
"""
import asyncio
import hashlib
import secrets
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str | uuid.UUID, token_version: int = 0, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRES_MINUTES
    )
    payload = {"sub": str(subject), "ver": token_version, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raise jwt.PyJWTError on invalid/expired token."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def generate_reset_token() -> str:
    """High-entropy one-time reset token (shown once in dev, emailed in prod)."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def mask_email(email: str) -> str:
    """d***@localpulse.dev — reveal only the first character + domain."""
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    shown = local[:1] if local else ""
    return f"{shown}***@{domain}"


class FailedLoginTracker:
    """Per-email failed-attempt lockout. Redis-backed with in-memory fallback
    (mirrors the rate-limiter pattern) so dev without Redis still works.

    NOTE: the Redis client is async — every method here is a coroutine and
    must be awaited (a missed await silently returns a truthy coroutine and
    would lock out everyone).
    """

    def __init__(self, max_attempts: int, lockout_minutes: int) -> None:
        self.max_attempts = max_attempts
        self.lockout_seconds = lockout_minutes * 60
        self._memory: dict[str, list[float]] = defaultdict(list)
        self._locked_until: dict[str, float] = {}

    @staticmethod
    def _redis():
        from app.core.redis_client import get_redis  # local import avoids cycle

        return get_redis()

    def _key(self, email: str) -> str:
        return f"login:fail:{email.lower()}"

    async def locked(self, email: str) -> bool:
        key = self._key(email)
        client = self._redis()
        if client is not None:
            try:
                return bool(await asyncio.wait_for(client.get(f"{key}:lock"), timeout=1.0))
            except Exception:
                pass
        return time.monotonic() < self._locked_until.get(key, 0)

    async def record_failure(self, email: str) -> None:
        key = self._key(email)
        client = self._redis()
        if client is not None:
            try:
                pipe = client.pipeline()
                pipe.incr(key)
                pipe.expire(key, self.lockout_seconds)
                count, _ = await asyncio.wait_for(pipe.execute(), timeout=1.0)
                if int(count) >= self.max_attempts:
                    await client.setex(f"{key}:lock", self.lockout_seconds, "1")
                    await client.delete(key)
                return
            except Exception:
                pass
        now = time.monotonic()
        bucket = [t for t in self._memory[key] if t > now - self.lockout_seconds]
        bucket.append(now)
        self._memory[key] = bucket
        if len(bucket) >= self.max_attempts:
            self._locked_until[key] = now + self.lockout_seconds
            self._memory[key] = []

    async def clear(self, email: str) -> None:
        key = self._key(email)
        client = self._redis()
        if client is not None:
            try:
                await asyncio.wait_for(client.delete(key, f"{key}:lock"), timeout=1.0)
            except Exception:
                pass
        self._memory.pop(key, None)
        self._locked_until.pop(key, None)


failed_login_tracker = FailedLoginTracker(
    max_attempts=settings.LOGIN_MAX_ATTEMPTS,
    lockout_minutes=settings.LOGIN_LOCKOUT_MINUTES,
)
