import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.websockets.manager import manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed demo data in dev and start the feed pub/sub listener.
    DB/Redis may be down — never crash startup."""
    if settings.APP_ENV == "development" and settings.SEED_DEMO_DATA:
        try:
            from app.db.seed import seed_demo_data

            await seed_demo_data()
            logger.info("Demo seed complete.")
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Demo seed skipped (%s). DB up? Run: alembic upgrade head", exc)

    listener = None
    if settings.APP_ENV != "test":
        from app.services.events import redis_feed_listener

        listener = asyncio.create_task(redis_feed_listener())
    yield
    if listener:
        listener.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Hyperlocal community platform API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME}


@app.websocket("/ws/feed")
async def feed_websocket(websocket: WebSocket) -> None:
    """Live feed events: new posts broadcast as {"type": "feed.post_created", ...}."""
    await manager.connect(websocket)
    try:
        # The client only listens; keep the connection alive.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
