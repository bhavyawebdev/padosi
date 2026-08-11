"""Pydantic v2 schemas for Verified Help (Phase 3)."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ProviderCategory = Literal[
    "cook", "maid", "tutor", "plumber", "electrician", "dog_walker", "other"
]


class ProviderCreate(BaseModel):
    category: ProviderCategory
    tagline: str = Field(min_length=3, max_length=160)
    price_range: str | None = Field(default=None, max_length=80)
    availability: str | None = Field(default=None, max_length=120)
    service_area_km: float = Field(default=3.0, ge=0.5, le=50)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class ProviderUpdate(BaseModel):
    tagline: str | None = Field(default=None, min_length=3, max_length=160)
    price_range: str | None = Field(default=None, max_length=80)
    availability: str | None = Field(default=None, max_length=120)
    service_area_km: float | None = Field(default=None, ge=0.5, le=50)


class ProviderOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    category: ProviderCategory
    tagline: str
    price_range: str | None
    availability: str | None
    service_area_km: float
    verified: bool
    verification_count: int
    review_count: int
    avg_rating: float | None
    distance_m: float | None


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=10, max_length=2000, description="Mandatory text review — this is what builds trust")


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewer_name: str
    rating: int
    text: str
    created_at: datetime


class ProviderDetailOut(ProviderOut):
    reviews: list[ReviewOut]
