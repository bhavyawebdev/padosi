"""Connection manager for the live feed WebSocket.

Single-process dev: local broadcast only (Redis optional). With Redis up, a
background listener forwards cross-process events to the local connections
(see app.services.events). Payloads are JSON objects like
{"type": "feed.post_created", "post_id": "...", "created_at": "..."} — the
client invalidates its feed query, which refetches the authoritative rows.
"""
import asyncio
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)

FEED_CHANNEL = "feed:events"


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        if not self.active:
            return
        stale: list[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.active.discard(ws)


manager = ConnectionManager()
