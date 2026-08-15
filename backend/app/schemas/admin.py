"""Pydantic v2 schemas for the admin API (Phase 6 — admin dashboards)."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.user import UserRole


class AdminOverviewCounts(BaseModel):
    users: int
    businesses: int
    communities: int
    feed_posts: int
    active_posts: int
    open_requests: int
    providers: int
    verified_providers: int
    reviews: int
    reports: int


class CategoryCount(BaseModel):
    category: str
    count: int


class DailyCount(BaseModel):
    date: str
    count: int


class AdminReportOut(BaseModel):
    id: uuid.UUID
    reporter_name: str
    target_type: str  # feed | request | provider
    target_id: uuid.UUID
    reason: str
    created_at: datetime


class AdminOverviewOut(BaseModel):
    counts: AdminOverviewCounts
    posts_by_category: list[CategoryCount]
    signups_last_7_days: list[DailyCount]
    recent_reports: list[AdminReportOut]


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    phone: str | None
    phone_verified: bool
    govt_id_verified: bool
    locality_name: str | None
    created_at: datetime


class AdminUserUpdate(BaseModel):
    role: UserRole | None = None
    phone_verified: bool | None = None
    govt_id_verified: bool | None = None


class AdminPostOut(BaseModel):
    id: uuid.UUID
    author_name: str
    author_role: str
    category: str
    text: str
    confirm_count: int
    resolved: bool
    urgent: bool
    created_at: datetime
    expires_at: datetime


class AdminRequestOut(BaseModel):
    id: uuid.UUID
    author_name: str
    type: str
    text: str
    status: str
    reply_count: int
    needed_by: datetime
    created_at: datetime


class AdminProviderOut(BaseModel):
    id: uuid.UUID
    display_name: str
    category: str
    tagline: str
    verified: bool
    verification_count: int
    review_count: int
    avg_rating: float
    created_at: datetime


class CommunityOverviewOut(BaseModel):
    locality_name: str
    post_count: int
    active_post_count: int
    request_count: int
    provider_count: int
    posts_by_category: list[CategoryCount]
    recent_posts: list[AdminPostOut]
