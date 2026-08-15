"""Pydantic v2 schemas for auth & users (Phase 1)."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

UserRole = Literal["individual", "business", "community", "admin"]

# Roles a user may *choose* at signup — never "admin" (platform staff only).
SignupRole = Literal["individual", "business", "community"]


class LocalityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    city: str
    state: str
    lat: float
    lng: float


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    role: SignupRole = "individual"
    locality_id: uuid.UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    sent: bool
    expires_min: int
    # Dev-only: no email provider is wired, so the reset link/token is
    # returned here for local testing. In production this stays None and the
    # link is emailed instead.
    dev_reset_token: str | None = None
    dev_reset_url: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class RecoverEmailRequest(BaseModel):
    phone: str = Field(min_length=5, max_length=20)


class RecoverEmailResponse(BaseModel):
    found: bool
    email: str | None = None
    name: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class PhoneVerifyRequest(BaseModel):
    code: str = Field(min_length=4, max_length=10)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    about: str | None = Field(default=None, max_length=500)
    locality_id: uuid.UUID | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None
    phone_verified: bool
    govt_id_verified: bool
    role: UserRole
    about: str | None
    locality: LocalityOut | None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    # Identifies this login in the "recent sign-ins" audit list.
    session_id: str | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip: str | None
    user_agent: str | None
    created_at: datetime


class ActivityItem(BaseModel):
    type: Literal["post", "request", "review", "reply"]
    title: str
    detail: str
    created_at: datetime


class ActivityOut(BaseModel):
    posts_count: int
    requests_count: int
    reviews_count: int
    replies_count: int
    items: list[ActivityItem]


class NotificationOut(BaseModel):
    """Something *other neighbors* did that involves the current user."""

    id: str
    type: Literal["reply", "confirm", "review"]
    title: str
    detail: str
    created_at: datetime
    target_type: Literal["request", "post", "provider"]
    target_id: uuid.UUID
