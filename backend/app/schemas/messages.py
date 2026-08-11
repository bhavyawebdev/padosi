"""Pydantic v2 schemas for user-to-user DMs + service bookings."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    body: str
    created_at: datetime
    read_at: datetime | None


class ConversationStart(BaseModel):
    user_id: uuid.UUID


class ConversationOut(BaseModel):
    """A row in the inbox — the other person + last message + unread count."""

    id: uuid.UUID
    other_user_id: uuid.UUID
    other_name: str
    last_message: str
    last_message_at: datetime
    unread_count: int


class ConversationDetailOut(BaseModel):
    id: uuid.UUID
    other_user_id: uuid.UUID
    other_name: str
    messages: list[MessageOut]


class BookingCreate(BaseModel):
    message: str = Field(min_length=5, max_length=1000)


class BookingOut(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    provider_name: str
    provider_category: str
    customer_id: uuid.UUID
    customer_name: str
    message: str
    status: Literal["new", "accepted", "declined"]
    reply: str | None
    direction: Literal["incoming", "outgoing"]
    created_at: datetime


class BookingRespond(BaseModel):
    status: Literal["accepted", "declined"]
    reply: str | None = Field(default=None, max_length=1000)
