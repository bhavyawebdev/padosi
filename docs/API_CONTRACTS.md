# LocalPulse — API Contracts

Base URL (dev): `http://localhost:8000/api/v1`
Auth: `Authorization: Bearer <token>` for authenticated routes.
Errors: JSON `{"detail": "..."}`. Common codes: 400 invalid, 401 unauthenticated,
403 forbidden, 404 not found, 409 conflict, 410 gone, 429 rate limited.

---

## Auth

### POST /auth/signup
Creates a user + returns a token.

Request:
```json
{ "email": "you@example.com", "password": "8+ chars", "full_name": "Asha Verma",
  "phone": "+9198...", "role": "individual", "locality_id": "<uuid>" }
```
`role`: `individual | business | community`. `phone` optional.
Response `201`: `TokenResponse { access_token, token_type: "bearer", user }`
Errors: 409 (email exists), 400 (unknown locality).

### POST /auth/login
Request: `{ "email", "password" }` → `200 TokenResponse`.
Security: failed attempts are tracked per email — after `LOGIN_MAX_ATTEMPTS`
(default 5) the account is locked for `LOGIN_LOCKOUT_MINUTES` (15) and returns
`429`; a per-IP rate limiter (60/min) also applies. Every login records a
`UserSession` (ip + user-agent) for the audit list.
Errors: 401, 429 (locked / rate limited).

### POST /auth/logout
Auth. → `200 { "ok": true }`. **Secure logout**: bumps the token version so
EVERY issued JWT for this user is invalidated (all devices signed out).
The client also clears its local token.

### POST /auth/forgot-password
Public. Request: `{ "email" }` → `200 ForgotPasswordResponse`:
```json
{ "sent": true, "expires_min": 30, "dev_reset_token": "<one-time-token>", "dev_reset_url": "/reset-password?token=..." }
```
Dev build returns the one-time token/link in the response so the flow is
testable end-to-end. **Production fails closed with `501`** until an email
provider is wired (token is emailed, never returned). Responds identically
whether or not the email exists (no account enumeration).

### POST /auth/reset-password
Public. Request: `{ "token": "<one-time-token>", "new_password": "8+ chars" }`
→ `200 { "ok": true }`. Tokens are stored **hashed**, single-use (`used_at`),
and expire after `PASSWORD_RESET_TTL_MINUTES`. Success bumps the token version
(signs the user out everywhere). Errors: 400 (invalid / already-used / expired).

### POST /auth/recover-email
Public — "forgot my email". Request: `{ "phone": "+9198..." }`
→ `200 RecoverEmailResponse`:
```json
{ "found": true, "email": "demo@localpulse.dev", "name": "Demo Resident" }
```
Dev returns the full email; **production returns a masked form** (`d***@...`)
so the endpoint can't be used to harvest addresses.

### POST /auth/change-password
Auth. Request: `{ "current_password", "new_password": "8+ chars" }`
→ `200 TokenResponse` (fresh token — this device stays signed in; all other
devices are signed out via the token-version bump).
Errors: 400 (wrong current password / new equals current).

### POST /auth/signout-others
Auth. → `200 TokenResponse` (fresh token). Signs out every device **except
this one** — privacy control for a lost/stolen device or shared computer.

### POST /auth/verify-phone
Auth required. Request: `{ "code": "123456" }` → `200 User`.
Stub: any 6-digit code accepted outside production; **fails closed with 501 in
production** until a real OTP provider is wired.

---

## Users

### GET /users/me
Auth. → `200 User`
```json
{ "id": "...", "email": "...", "full_name": "...", "phone": "...", "phone_verified": true,
  "govt_id_verified": false, "role": "individual", "about": null,
  "locality": { "id": "...", "name": "Bandra West", "city": "Mumbai", "lat": 19.05, "lng": 72.83 },
  "created_at": "..." }
```

### PATCH /users/me
Auth. Partial: `{ "full_name"?, "phone"?, "about"?, "locality_id"? }` → `200 User`.

### GET /users/me/activity
Auth. → `200` `{ posts_count, requests_count, reviews_count, replies_count, items[] }`
`items` = merged recent activity `{ type: post|request|review|reply, title, detail, created_at }`.

### GET /users/me/sessions
Auth. → `200 LoginSessionOut[]` (newest first) — the "recent sign-ins" audit list:
```json
[{ "id": "...", "ip": "127.0.0.1", "user_agent": "Mozilla/5.0 ... Chrome/…", "created_at": "..." }]
```
The frontend marks the row whose `id` matches the stored `session_id` as
"this device".

### GET /users/me/notifications
Auth. → `200 NotificationOut[]` (newest first).
```json
[{ "id": "...", "type": "reply|confirm|review", "title": "Arjun K. replied to your request",
   "detail": "...", "created_at": "...", "target_type": "request|post|provider", "target_id": "..." }]
```
Frontend marks read state locally (unread badge) via `last-read` timestamp in localStorage.

---

## Localities

### GET /localities
Query: `city?`, `state?`, `q?` (name substring). Ordered by state → city → name.
→ `200 Locality[]`
```json
[{ "id": "...", "name": "Bandra West", "city": "Mumbai", "state": "Maharashtra",
   "lat": 19.0554, "lng": 72.8326 }]
```
The dev seed covers **100 localities across 28 Indian cities and 18 states**
(Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad,
Jaipur, Chandigarh, Kochi, Lucknow, Indore, Nagpur, Surat, Patna,
Bhubaneswar, Guwahati, Goa, etc.) — the platform is not Mumbai-only.

---

## Feed — Nearby Right Now

### GET /feed
Public (auth optional — sets `confirmed_by_me`).
Query: `lat`, `lng` (required), `radius_km` (default 3.0, 0.1–50), `category`
(`traffic|civic|safety|utility|event|other`), `q` (free-text search on post text),
`include_resolved` (bool, default false).
→ `200 FeedPost[]`, ordered created_at desc then distance asc:
```json
[{ "id": "...", "user_id": "...", "author_name": "...", "author_role": "community",
   "category": "utility", "text": "...", "distance_m": 350.2,
   "created_at": "...", "expires_at": "...", "confirm_count": 12,
   "confirmed_by_me": false, "resolved": false, "urgent": true }]
```
Only non-expired (`expires_at > now`) posts within the radius are returned.

### GET /feed/{post_id}
Public (auth optional — sets `confirmed_by_me`). Single post by id (no radius
filter — used for share links and post detail pages). → `200 FeedPost`.
Errors: 404, 410 (expired).

### POST /feed
Auth + rate limited (10/hour/user). Request:
```json
{ "category": "traffic", "text": "...", "lat": 19.05, "lng": 72.83, "urgent": false }
```
→ `201 FeedPost` (distance null). Expiry is per-category (traffic/safety 6h,
utility/civic 12h, event 24h, other 12h). Broadcasts `feed.post_created` over WS.
Errors: 429.

### POST /feed/{post_id}/confirm
Auth. → `200 FeedPost`. One vote per user; idempotent. Errors: 404, 410 (expired/resolved).

### POST /feed/{post_id}/resolve
Auth. Author or community role. → `200 FeedPost` (resolved=true, drops off feed).
Errors: 403 (not author), 404.

### POST /feed/{post_id}/report
Auth. `{ "reason": "3–300 chars" }` → `201 {"ok": true}`. Errors: 404.

### DELETE /feed/{post_id}
Auth. Author only. → `204`. Errors: 403, 404.

---

## Directory — Verified Help

### GET /directory
Public. Query: `lat`, `lng` (required), `radius_km` (default 10), `category`
(`cook|maid|tutor|plumber|electrician|dog_walker|other`), `verified_only` (bool),
`q` (search tagline/name). → `200 ProviderOut[]`, verified first, then distance:
```json
[{ "id": "...", "user_id": "...", "display_name": "Ramesh Kumar",
   "category": "cook", "tagline": "...", "price_range": null, "availability": null,
   "service_area_km": 3, "verified": true, "verification_count": 12,
   "review_count": 12, "avg_rating": 4.9, "distance_m": 400.0 }]
```

### POST /directory
Auth. Request: `{ "category", "tagline", "price_range"?, "availability"?,
"service_area_km" (default 3), "lat", "lng" }` → `201 ProviderOut`.
Errors: 409 (profile already exists).

### GET /directory/{provider_id}
Public. → `200 ProviderDetailOut` (ProviderOut + `reviews[]`):
```json
{ "...provider fields...", "reviews": [{ "id": "...", "provider_id": "...",
  "reviewer_id": "...", "reviewer_name": "Priya Nair", "rating": 5,
  "text": "...", "created_at": "..." }] }
```

### PATCH /directory/{provider_id}
Auth, owner only. Partial: `{ "tagline"?, "price_range"?, "availability"?, "service_area_km"? }`
→ `200 ProviderOut`. Errors: 403, 404.

### POST /directory/{provider_id}/reviews
Auth + rate limited. Request: `{ "rating": 1..5, "text": "≥10 chars (mandatory)" }`
→ `201 ReviewOut`. One review per reviewer per provider. Recomputes verification
(sets `verified` once text-review count ≥ 3). Errors: 400 (self-review), 409 (already reviewed), 429.

### POST /directory/{provider_id}/report
Auth. `{ "reason" }` → `201 {"ok": true}`.

---

## Requests — Need It Now

### GET /requests
Public. Query: `lat`, `lng` (required), `radius_km` (default 3), `type`
(`borrow_lend|ride_share|spare_item|other`), `status` (`open` default |
`fulfilled | expired`), `q` (free-text search on request text). → `200 RequestOut[]`, soonest deadline first:
```json
[{ "id": "...", "user_id": "...", "author_name": "Rohan D.", "type": "ride_share",
   "text": "...", "distance_m": 350.0, "needed_by": "...", "status": "open",
   "reply_count": 1, "created_at": "..." }]
```

### POST /requests
Auth + rate limited. Request:
```json
{ "type": "borrow_lend", "text": "...", "lat": 19.05, "lng": 72.83,
  "needed_by": "2026-08-10T05:00:00Z" }
```
→ `201 RequestOut`. Errors: 400 (needed_by in past), 429.

### GET /requests/{request_id}
Public. → `200 RequestDetailOut` (RequestOut + `replies[]`):
```json
{ "...request fields...", "replies": [{ "id": "...", "request_id": "...",
  "user_id": "...", "author_name": "Sarah M.", "message": "...", "created_at": "..." }] }
```

### POST /requests/{request_id}/replies
Auth. `{ "message": "1–1000 chars" }` → `201 ReplyOut`. Errors: 410 (closed).

### POST /requests/{request_id}/fulfill
Auth, requester only. → `200 RequestDetailOut`. Errors: 403, 404.

### POST /requests/{request_id}/report
Auth. `{ "reason" }` → `201 {"ok": true}`.

---

## Messages — user-to-user DMs

Private 1:1 chats between neighbours. Conversations are get-or-create and
pair-normalized (user A ↔ user B is one row regardless of who starts).
Read state is per message (`read_at`); reading a thread marks the other
person's messages as read.

### GET /messages/conversations
Auth. → `200 ConversationOut[]`, most recently active first:
```json
[{ "id": "...", "other_user_id": "...", "other_name": "Ramesh Kumar",
   "last_message": "Absolutely! I'm free Saturday…", "last_message_at": "...",
   "unread_count": 2 }]
```

### POST /messages/conversations
Auth. Request: `{ "user_id": "<uuid>" }` → `201 ConversationDetailOut`.
Errors: 400 (messaging yourself), 404 (user not found). Idempotent — returns
the existing conversation if the pair already has one.

### GET /messages/conversations/{conversation_id}/messages
Auth + participant. Marks the other side's messages read. → `200 ConversationDetailOut`:
```json
{ "id": "...", "other_user_id": "...", "other_name": "...",
  "messages": [{ "id": "...", "conversation_id": "...", "sender_id": "...",
    "sender_name": "...", "body": "...", "created_at": "...", "read_at": null }] }
```
Errors: 404.

### POST /messages/conversations/{conversation_id}/messages
Auth + participant. Request: `{ "body": "1–2000 chars" }` → `201 MessageOut`.
Errors: 404.

---

## Chat — LocalPulse assistant

Rule-based, data-aware assistant. No external AI provider or API key — it
answers from the platform's own data (providers/posts/requests near the
caller) plus a knowledge base about how the platform works.

### POST /chat
Auth optional (unauthenticated calls use the default Bandra West centre).
Request: `{ "message": "1–500 chars", "lat"?, "lng"? }`
→ `200 ChatResponse`:
```json
{ "reply": "I found 2 plumbers within 5 km of you:\n\n• **Ramesh Kumar** …",
  "suggestions": ["Verified only", "Show me cooks instead"] }
```
Intents: provider categories, request types, live-post keywords, "how do I…"
(verify/post/review/report/chat/book), greetings/thanks, and a helpful fallback.

---

## Map

### GET /map/markers
Auth optional. Query: `lat`, `lng` (required), `radius_km` (default 5, 0.5–50).
→ `200 MapMarker[]` — posts, requests and providers within the radius in one call:
```json
[{ "id": "...", "kind": "post|request|provider", "category": "traffic",
   "title": "Heavy congestion near Hill Road…", "lat": 19.05, "lng": 72.83,
   "distance_m": 400.0, "meta": "expires 18:00", "href": "/posts/<uuid>" }]
```
`href` is a client route for the popup's "View details" link.

---

## Directory — service bookings

### GET /directory/bookings
Auth. → `200 BookingOut[]` — incoming (my provider profile) and outgoing
(I asked a provider), newest first:
```json
[{ "id": "...", "provider_id": "...", "provider_name": "Ramesh Kumar",
   "provider_category": "cook", "customer_id": "...", "customer_name": "Demo Resident",
   "message": "...", "status": "new|accepted|declined", "reply": null,
   "direction": "incoming|outgoing", "created_at": "..." }]
```

### POST /directory/{provider_id}/bookings
Auth + rate limited. Request: `{ "message": "≥5 chars" }` → `201 BookingOut`
(direction `outgoing`). Errors: 400 (own service), 404, 429.

### POST /directory/bookings/{booking_id}/respond
Auth, the provider only. Request: `{ "status": "accepted|declined", "reply"? }`
→ `200 BookingOut` (direction `incoming`). Accepting **auto-opens a 1:1
conversation** between provider and customer so they can coordinate.
Errors: 400 (already answered), 403, 404.

---

## Admin

Two access tiers: `admin` (platform-wide) and `community` (locality-scoped
society dashboard). Community moderation is limited to posts within the
account's locality radius (5 km from the society centroid).

### GET /admin/overview
Admin only. → `200 AdminOverviewOut`:
```json
{ "counts": { "users": 8, "businesses": 1, "communities": 1, "feed_posts": 5,
    "active_posts": 5, "open_requests": 3, "providers": 2,
    "verified_providers": 1, "reviews": 7, "reports": 0 },
  "posts_by_category": [{ "category": "utility", "count": 2 }],
  "signups_last_7_days": [{ "date": "2026-08-09", "count": 8 }],
  "recent_reports": [{ "id": "...", "reporter_name": "...", "target_type": "feed",
    "target_id": "...", "reason": "...", "created_at": "..." }] }
```
Errors: 401, 403.

### GET /admin/users
Admin only. Query: `q?` (name/email search), `role?` (`individual|business|community|admin`).
→ `200 AdminUserOut[]` (newest first, max 200):
```json
[{ "id": "...", "email": "...", "full_name": "...", "role": "admin",
   "phone": "...", "phone_verified": true, "govt_id_verified": true,
   "locality_name": "Bandra West", "created_at": "..." }]
```

### PATCH /admin/users/{user_id}
Admin only. Partial: `{ "role"?, "phone_verified"?, "govt_id_verified"? }` → `200 AdminUserOut`.
Errors: 404, 403.

### GET /admin/posts
Admin only. Query: `category?`. → `200 AdminPostOut[]` (newest first, max 100):
```json
[{ "id": "...", "author_name": "...", "author_role": "individual",
   "category": "utility", "text": "...", "confirm_count": 12, "resolved": false,
   "urgent": true, "created_at": "...", "expires_at": "..." }]
```

### POST /admin/posts/{post_id}/resolve
Admin or community (community: post must be inside its locality radius).
→ `200 AdminPostOut` (resolved=true). Errors: 403, 404.

### DELETE /admin/posts/{post_id}
Admin or community (same locality scoping). → `204`. Errors: 403, 404.

### GET /admin/requests
Admin only. → `200 AdminRequestOut[]` (newest first, max 100):
```json
[{ "id": "...", "author_name": "...", "type": "ride_share", "text": "...",
   "status": "open", "reply_count": 1, "needed_by": "...", "created_at": "..." }]
```

### DELETE /admin/requests/{request_id}
Admin only. → `204`. Errors: 404.

### GET /admin/providers
Admin only. → `200 AdminProviderOut[]` (newest first, max 100):
```json
[{ "id": "...", "display_name": "Ramesh Kumar", "category": "cook",
   "tagline": "...", "verified": true, "verification_count": 5,
   "review_count": 5, "avg_rating": 4.8, "created_at": "..." }]
```

### DELETE /admin/providers/{provider_id}
Admin only. Cascades reviews. → `204`. Errors: 404.

### GET /admin/reports
Admin only. → `200 AdminReportOut[]` (newest first, max 100) — the abuse queue.

### DELETE /admin/reports/{report_id}
Admin only. Dismisses a report. → `204`. Errors: 404.

### GET /admin/community/overview
Community or admin. Uses the caller's locality as the area centre.
→ `200 CommunityOverviewOut`:
```json
{ "locality_name": "Bandra West", "post_count": 5, "active_post_count": 5,
  "request_count": 3, "provider_count": 2,
  "posts_by_category": [{ "category": "traffic", "count": 1 }],
  "recent_posts": [ /* AdminPostOut[], newest 20 */ ] }
```
Errors: 400 (no locality assigned).

---

## WebSocket

### WS /ws/feed
Server pushes JSON events; client only listens (client frames are ignored):
```json
{ "type": "feed.post_created", "post_id": "<uuid>", "created_at": "..." }
```
Client behavior: invalidate the `["feed"]` query and refetch.

---

## Rate limits
- `POST /feed`, `POST /requests`, `POST /directory/{id}/reviews`:
  `POST_RATE_LIMIT_PER_HOUR` (default 10) per user (falls back to client IP for anonymous).
  Returns `429` with a human-readable detail.
- `POST /auth/login`: 60/min per IP (Redis-backed, in-memory fallback when
  Redis is down). Separate per-email lockout (5 failures → 15 min) stops
  credential stuffing even through the IP limiter.
