"""Realtime event plumbing for the live feed.

- publish_feed_event: fans out to local WS connections and, when Redis is up,
  to the "feed:events" channel (for other workers/processes). Each event
  carries a unique event_id so the pub/sub listener can drop the echo of its
  own publish (avoids duplicate local broadcasts).
- redis_feed_listener: background task that forwards channel events to local
  connections. No-op when Redis is down (single-process dev still works).
"""
import asyncio
import json
import logging
import uuid
from collections import deque

from app.core.redis_client import get_redis
from app.websockets.manager import FEED_CHANNEL, manager

logger = logging.getLogger(__name__)

_recent_events: deque[str] = deque(maxlen=64)


def _seen_recently(event_id: str) -> bool:
    if event_id in _recent_events:
        return True
    _recent_events.append(event_id)
    return False


async def publish_feed_event(event: dict) -> None:
    """Broadcast a feed event to all connected clients (local + Redis fan-out)."""
    event = {**event, "event_id": uuid.uuid4().hex}
    await manager.broadcast(event)
    client = get_redis()
    if client is not None:
        try:
            await client.publish(FEED_CHANNEL, json.dumps(event))
        except Exception as exc:  # redis hiccup — local broadcast already happened
            logger.debug("Redis publish failed: %s", exc)


async def redis_feed_listener() -> None:
    """Long-running task: subscribe to feed events and forward to local WS."""
    client = get_redis()
    if client is None:
        return
    try:
        pubsub = client.pubsub()
        await pubsub.subscribe(FEED_CHANNEL)
        logger.info("Feed pub/sub listener started on %s", FEED_CHANNEL)
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                event = json.loads(message["data"])
            except Exception as exc:
                logger.debug("Bad feed event payload: %s", exc)
                continue
            # Drop the echo of our own publish (we already broadcast locally).
            if _seen_recently(event.get("event_id", "")):
                continue
            await manager.broadcast(event)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.warning("Feed pub/sub listener stopped (%s); local broadcast still active.", exc)
