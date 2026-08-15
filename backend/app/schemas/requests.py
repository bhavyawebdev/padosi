"""Pydantic v2 schemas for Need It Now (Phase 4)."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RequestType = Literal["borrow_lend", "ride_share", "spare_item", "other"]
RequestStatus = Literal["open", "fulfilled", "expired"]


class RequestCreate(BaseModel):
    type: RequestType
    text: str = Field(min_length=3, max_length=1000)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    needed_by: datetime


class RequestOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    author_name: str
    type: RequestType
    text: str
    distance_m: float | None
    needed_by: datetime
    status: RequestStatus
    reply_count: int
    created_at: datetime


class ReplyCreate(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ReplyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    request_id: uuid.UUID
    user_id: uuid.UUID
    author_name: str
    message: str
    created_at: datetime


class RequestDetailOut(RequestOut):
    replies: list[ReplyOut]
