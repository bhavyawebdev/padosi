"""Pydantic v2 schemas for the Nearby Right Now feed."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FeedCategory = Literal["traffic", "civic", "safety", "utility", "event", "other"]


class PostCreate(BaseModel):
    category: FeedCategory
    text: str = Field(min_length=3, max_length=1000)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    urgent: bool = False


class FeedPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    author_name: str
    author_role: str | None
    category: FeedCategory
    text: str
    distance_m: float | None
    created_at: datetime
    expires_at: datetime
    confirm_count: int
    confirmed_by_me: bool
    resolved: bool
    urgent: bool


class ReportCreate(BaseModel):
    reason: str = Field(min_length=3, max_length=300)
