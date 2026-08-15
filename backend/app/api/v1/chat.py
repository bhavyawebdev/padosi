"""LocalPulse assistant — a friendly, data-aware helper.

No external AI provider or API key is required: the assistant answers from
the platform's own data (providers, live posts and open requests near the
user) plus a small knowledge base about how LocalPulse works. If an OpenAI-
style provider is added later, this module is the single place to swap in a
real LLM behind the same request/response contract.
"""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_optional_user
from app.db.session import get_db
from app.models.directory import ProviderProfile
from app.models.feed import FeedPost
from app.models.requests import Request
from app.models.user import User
from app.services.geo_engine import distance_expression, within_radius_expression

router = APIRouter()

DEFAULT_RADIUS_KM = 5.0
DEFAULT_CENTER = (19.0554, 72.8326)  # Bandra West — only used when nothing else is known


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str]


# --- Intent detection -------------------------------------------------------

_PROVIDER_KEYWORDS: dict[str, list[str]] = {
    "cook": ["cook", "chef", "meal", "food", "tiffin", "dinner", "lunch", "thali"],
    "maid": ["maid", "house help", "cleaning", "cleaner", "housekeeping", "sweeper"],
    "tutor": ["tutor", "tuition", "teacher", "coaching", "classes", "maths", "math", "science"],
    "plumber": ["plumber", "plumbing", "leak", "tap", "pipe", "drain"],
    "electrician": ["electrician", "electrical", "wiring", "fuse", "switch", "fan", "current"],
    "dog_walker": ["dog", "pet", "walker", "walk"],
}

_REQUEST_KEYWORDS: dict[str, list[str]] = {
    "borrow_lend": ["borrow", "lend", "ladder", "drill", "tool", "loan"],
    "ride_share": ["ride", "lift", "airport", "car", "taxi", "pickup", "drop"],
    "spare_item": ["ticket", "spare", "extra", "giveaway", "free"],
}

_POST_KEYWORDS: dict[str, list[str]] = {
    "traffic": ["traffic", "jam", "congestion", "road", "accident", "diversion"],
    "civic": ["road", "garbage", "street light", "pothole", "civic"],
    "safety": ["police", "checkpoint", "safety", "suspicious", "theft"],
    "utility": ["water", "power", "electricity", "outage", "supply", "wifi", "internet"],
    "event": ["event", "meetup", "festival", "workshop", "movie", "party", "drive"],
}


def _contains(text: str, words: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(w)}\b", text) for w in words)


def _greeting(text: str) -> bool:
    return bool(re.match(r"^\s*(hi|hello|hey|namaste|hola|yo|good\s*(morning|afternoon|evening))\b", text.lower()))


def _thanks(text: str) -> bool:
    return bool(re.search(r"\b(thanks|thank you|thx|dhanyavad|shukriya)\b", text.lower()))


def _how_do_i(text: str) -> str | None:
    lower = text.lower()
    if _contains(lower, ["post", "share an update", "create a post", "announce"]):
        return (
            "To share a pulse: open the **Nearby** tab and tap the **What's happening in your area?** button. "
            "Pick a category (traffic, civic, safety, utility, event), add a short note, and it goes live to "
            "neighbours within a few kilometres. It auto-expires in 6–12 hours, keeping the feed fresh."
        )
    if _contains(lower, ["verify", "verified", "badge"]):
        return (
            "**Getting verified:**\n"
            "• As a resident — add your phone number on your profile; we verify it with a one-time code.\n"
            "• As a provider — complete the business profile and collect **3 text reviews** from neighbours "
            "who actually used your service. The green verified badge appears automatically once you hit that."
        )
    if _contains(lower, ["review", "rate", "star"]):
        return (
            "You can review a provider from their profile page — hit **Write a review**. We require a short "
            "text note alongside the star rating so reviews stay honest and helpful."
        )
    if _contains(lower, ["request", "ask for help", "need it"]):
        return (
            "Need something fast? Open the **Needs** tab and create a request — borrow/lend, ride share, "
            "spare item, or other. Give it a 'needed by' time and neighbours nearby will reply in the thread."
        )
    if _contains(lower, ["report", "abuse", "flag"]):
        return (
            "Every post, request and provider has a **Report** button. Tap it, pick a reason, and it goes "
            "straight to the moderation queue — the community team reviews it."
        )
    if _contains(lower, ["chat", "message", "dm"]):
        return (
            "You can message any neighbour directly from a post or request — hit the **Message** button. "
            "Your conversations live in the inbox (the chat icon at the top of the app)."
        )
    if _contains(lower, ["book", "hire", "contact", "service"]):
        return (
            "From any provider's profile, tap **Request service**, add a short note about what you need, "
            "and the provider gets it in their bookings. When they accept, you can chat directly with them."
        )
    return None


# --- Data lookups -----------------------------------------------------------

async def _find_providers(db: AsyncSession, category: str | None, lat: float, lng: float, limit: int = 3) -> list[str]:
    stmt = (
        select(ProviderProfile, distance_expression(ProviderProfile.location, lat, lng))
        .where(within_radius_expression(ProviderProfile.location, lat, lng, DEFAULT_RADIUS_KM * 1000))
        .order_by(ProviderProfile.verified.desc(), distance_expression(ProviderProfile.location, lat, lng).asc())
        .limit(limit)
    )
    if category:
        stmt = stmt.where(ProviderProfile.category == category)
    rows = (await db.execute(stmt)).all()
    lines: list[str] = []
    for profile, distance_m in rows:
        distance_m = round(distance_m)
        near = f"{distance_m}m away" if distance_m < 1000 else f"{distance_m / 1000:.1f}km away"
        trust = f"Verified by {profile.verification_count} neighbours" if profile.verified else f"{profile.review_count} review(s)"
        lines.append(f"• **{profile.user.full_name}** — {profile.tagline} · {near} · {trust}")
    return lines


async def _find_posts(db: AsyncSession, category: str | None, lat: float, lng: float, limit: int = 3) -> list[str]:
    stmt = (
        select(FeedPost, distance_expression(FeedPost.location, lat, lng))
        .where(
            within_radius_expression(FeedPost.location, lat, lng, DEFAULT_RADIUS_KM * 1000),
            FeedPost.resolved.is_(False),
            FeedPost.expires_at > datetime.now(timezone.utc),
        )
        .order_by(FeedPost.created_at.desc())
        .limit(limit)
    )
    if category:
        stmt = stmt.where(FeedPost.category == category)
    rows = (await db.execute(stmt)).all()
    return [f"• **{p.text[:110]}**" for p, _ in rows]


async def _find_requests(db: AsyncSession, req_type: str | None, lat: float, lng: float, limit: int = 2) -> list[str]:
    stmt = (
        select(Request, distance_expression(Request.location, lat, lng))
        .where(
            within_radius_expression(Request.location, lat, lng, DEFAULT_RADIUS_KM * 1000),
            Request.status == "open",
            Request.needed_by > datetime.now(timezone.utc),
        )
        .order_by(Request.needed_by.asc())
        .limit(limit)
    )
    if req_type:
        stmt = stmt.where(Request.type == req_type)
    rows = (await db.execute(stmt)).all()
    return [f"• **{r.text[:110]}**" for r, _ in rows]


# --- The endpoint -----------------------------------------------------------

@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    text = payload.message.strip().lower()
    suggestions: list[str] = []

    if payload.lat is not None and payload.lng is not None:
        center = (payload.lat, payload.lng)
    elif user is not None and user.locality is not None:
        center = (user.locality.lat, user.locality.lng)
    else:
        center = DEFAULT_CENTER
    lat, lng = center

    if _thanks(text):
        return ChatResponse(
            reply="Anytime! 🙌 That's what neighbours are for. Ping me whenever you need something nearby.",
            suggestions=["Find a plumber near me", "What's happening right now?", "How do I get verified?"],
        )

    if _greeting(text):
        return ChatResponse(
            reply=(
                f"Namaste{', ' + user.full_name if user else ''}! 👋 I'm the LocalPulse helper. "
                "I can find **providers nearby**, show you **what's happening right now**, surface **open "
                "requests**, or explain how anything works. What do you need?"
            ),
            suggestions=["Find a plumber near me", "What's happening nearby?", "Borrow a ladder nearby"],
        )

    kb = _how_do_i(text)
    if kb is not None:
        return ChatResponse(reply=kb, suggestions=["Find a provider near me", "What's happening right now?", "Ask for help — borrow something"])

    # Provider intents
    for category, words in _PROVIDER_KEYWORDS.items():
        if _contains(text, words):
            providers = await _find_providers(db, category, lat, lng)
            if providers:
                label = category.replace("_", " ")
                return ChatResponse(
                    reply=f"I found **{len(providers)} {label}** within {DEFAULT_RADIUS_KM:g} km of you:\n\n" + "\n".join(providers),
                    suggestions=["Verified only", "Show me cooks instead", "How do providers get verified?"],
                )
            return ChatResponse(
                reply=f"I couldn't find a {category.replace('_', ' ')} within {DEFAULT_RADIUS_KM:g} km right now. "
                      "Try widening the area on the **Help** tab, or check back later — new providers sign up often.",
                suggestions=["Show all providers near me", "How do I become a provider?"],
            )

    # Request-board intents
    for req_type, words in _REQUEST_KEYWORDS.items():
        if _contains(text, words):
            requests = await _find_requests(db, req_type, lat, lng)
            if requests:
                return ChatResponse(
                    reply=f"Here are open **{req_type.replace('_', ' / ')}** requests near you:\n\n" + "\n".join(requests),
                    suggestions=["Post a request myself", "What's happening nearby?"],
                )
            return ChatResponse(
                reply=f"No open {req_type.replace('_', ' / ')} requests nearby right now. You can create one on the **Needs** tab in a few seconds.",
                suggestions=["Create a request", "Find a provider near me"],
            )

    # Live-post intents
    for category, words in _POST_KEYWORDS.items():
        if _contains(text, words):
            posts = await _find_posts(db, category, lat, lng)
            if posts:
                return ChatResponse(
                    reply=f"Here's what neighbours are reporting right now:\n\n" + "\n".join(posts),
                    suggestions=["Is the water supply affected?", "Show all nearby posts", "Post an update"],
                )
            return ChatResponse(
                reply=f"Nothing about **{category}** nearby right now — all clear. If you're seeing something, post it on the **Nearby** tab so neighbours know!",
                suggestions=["Post a pulse", "What's happening nearby?"],
            )

    # Generic "show me" intents
    if _contains(text, ["all providers", "providers near", "who's near", "service provider", "help near", "show providers", "someone who"]):
        providers = await _find_providers(db, None, lat, lng, 4)
        if providers:
            return ChatResponse(
                reply=f"Here are trusted providers near you:\n\n" + "\n".join(providers),
                suggestions=["Verified only", "Find a tutor", "How do I get verified?"],
            )
        return ChatResponse(
            reply="No providers found within a few kilometres yet. Check the **Help** tab or come back soon!",
            suggestions=["How do providers get verified?", "Find a plumber near me"],
        )

    if _contains(text, ["happening", "nearby now", "any news", "updates", "what's up", "live feed", "pulse"]):
        posts = await _find_posts(db, None, lat, lng, 4)
        if posts:
            return ChatResponse(
                reply=f"Right now in your area:\n\n" + "\n".join(posts),
                suggestions=["Is the water supply affected?", "Show open requests", "Post an update"],
            )
        return ChatResponse(
            reply="Nothing reported nearby right now — a quiet neighbourhood! 🌿 Check the **Nearby** tab to see everything live.",
            suggestions=["Post a pulse", "Find a provider near me"],
        )

    if _contains(text, ["open request", "needs", "anyone asking", "help wanted", "borrow", "ask for"]):
        requests = await _find_requests(db, None, lat, lng, 3)
        if requests:
            return ChatResponse(
                reply=f"Neighbours currently asking for help:\n\n" + "\n".join(requests),
                suggestions=["Offer to help", "Find a provider near me"],
            )
        return ChatResponse(
            reply="No open requests nearby right now. You can post one on the **Needs** tab.",
            suggestions=["Create a request", "What's happening nearby?"],
        )

    # Fallback
    return ChatResponse(
        reply=(
            "I can help with things like:\n\n"
            "• **\"Find a plumber near me\"** — providers nearby\n"
            "• **\"What's happening nearby?\"** — live posts in your area\n"
            "• **\"Borrow a ladder\"** — open requests\n"
            "• **\"How do I get verified?\"** / **\"How do I post?\"** — how the platform works\n\n"
            "Try one of those, or tap a suggestion below."
        ),
        suggestions=["Find a plumber near me", "What's happening nearby?", "How do I get verified?"],
    )
