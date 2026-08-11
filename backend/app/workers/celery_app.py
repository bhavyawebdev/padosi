"""Celery application (broker/backend = Redis).

Run the worker on Windows with the solo pool:
    celery -A app.workers.celery_app:celery_app worker --pool=solo --loglevel=info
"""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "localpulse",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)
