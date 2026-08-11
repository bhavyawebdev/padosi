# LocalPulse — Architecture

> Rebrandable: "LocalPulse" is a working name; it appears only in branding/config,
> never in feature logic.

## 1. System overview

```
[ React + Vite frontend ]
      |  REST (TanStack Query) + WebSocket (/ws/feed)
      v
[ FastAPI (async) backend ]
   |-- Auth & Users
   |-- Feed Service      (Nearby Right Now)
   |-- Directory Service (Verified Help)
   |-- Request Board     (Need It Now)
   |-- Geo Engine        (shared, PostGIS-backed)
        |
        |-- PostgreSQL + PostGIS   (all structured + geo data)
        |-- Redis                  (cache, Celery broker, WS pub/sub — optional in dev)
        |-- Celery workers         (expiry sweeps, verification recalc, notifications)
```

## 2. Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + TS (strict) + Vite + Tailwind v4 | Tokens in `frontend/src/styles/theme.css`, extracted verbatim from `design-reference/DESIGN_SYSTEM.md` |
| Server state | TanStack Query v5 | No hand-rolled fetch/useEffect data loading |
| Charts | Recharts | Reserved for future community-admin dashboard; not used in core screens |
| Realtime | WebSocket | Live feed events; Redis pub/sub when available, in-process fallback in dev |
| Backend | FastAPI (async) + Pydantic v2 | Every endpoint validates request/response schemas |
| ORM | SQLAlchemy 2 (async) + Alembic | Every schema change is a migration under `backend/alembic/versions/` |
| Jobs | Celery + Redis | Windows dev: run with `--pool=solo` |
| DB | PostgreSQL + PostGIS | All radius queries via `ST_DWithin` / `ST_Distance` on `geography(Point,4326)` columns |
| Cache/broker | Redis | Rate limiting, Celery broker, feed pub/sub |

### Redis-optional dev mode (confirmed with the user)
If Redis is unreachable, the app degrades gracefully:
- rate limiter → per-process in-memory sliding window
- feed pub/sub → in-process broadcast only (fine for single-process dev)
- Celery → jobs must be triggered manually/periodically

No code changes are needed when Redis comes up — it is detected automatically.

## 3. Data model

```text
localities(id, name, city, lat, lng)
users(id, email, password_hash, full_name, phone, phone_verified, govt_id_verified,
      role[individual|business|community], about, locality_id FK, created_at)

feed_posts(id, user_id FK, category, text, location geography, created_at, expires_at,
           confirm_count, resolved, resolved_at, urgent)            -- Nearby Right Now
feed_post_confirms(id, post_id FK, user_id FK, created_at)          -- "Still happening" votes
provider_profiles(id, user_id FK unique, category, tagline, price_range, availability,
                  service_area_km, location geography, verified, verification_count, created_at)
reviews(id, provider_id FK, reviewer_id FK, rating, text, created_at)  -- text mandatory
requests(id, user_id FK, type, text, location geography, needed_by, status[open|fulfilled|expired], created_at)
request_replies(id, request_id FK, user_id FK, message, created_at)    -- per-request threads
reports(id, reporter_id FK, target_type, target_id, reason, created_at) -- abuse reports (all features)
```

- Every location column is `geography(Point,4326)` with a GiST index.
- Feed posts are **not deleted on expiry** — visibility is filtered by
  `expires_at > now()`; a Celery sweep purges rows older than expiry + 7 days.
- Verification (`provider_profiles.verified`) is derived from the count of
  **text reviews** (≥ `VERIFIED_REVIEW_THRESHOLD`, default 3) — never star averages.

## 4. Geo engine

`backend/app/services/geo_engine.py` is the **only** place distance logic lives.
The three features share `within_radius_expression` and `distance_expression`,
which compile to:

```sql
ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
ST_Distance(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)
```

Distances are in metres. **Never** use manual lat/lng math in Python.

## 5. Realtime flow

1. `POST /api/v1/feed` → row inserted → `services.events.publish_feed_event`
   broadcasts `{"type":"feed.post_created",...}` to local WS clients and (when
   Redis is up) to the `feed:events` channel.
2. `websockets/manager.py` holds connected clients; `redis_feed_listener`
   (started in the FastAPI lifespan) forwards channel events to local clients.
3. Frontend `useFeedSocket` invalidates the `["feed"]` query, which refetches
   the authoritative rows (distance is viewer-specific, so pushes are never
   trusted as data).

## 6. Background jobs (Celery)

`backend/app/workers/tasks.py`:
- `expire_requests` — flip open requests past `needed_by` to `expired`
- `purge_expired_feed_posts` — delete feed posts past expiry + 7 days
- `recalc_verifications` — rebuild verification counts/flags from text reviews
- `dispatch_notifications` — stub for future push/email

Windows dev: `celery -A app.workers.celery_app:celery_app worker --pool=solo --loglevel=info`

## 7. Infrastructure

`docker-compose.yml` provides Postgres+PostGIS and Redis for local dev. Without
Docker, use any PostgreSQL 14+ with the `postgis` extension enabled:

```sql
CREATE DATABASE localpulse;
CREATE EXTENSION IF NOT EXISTS postgis;   -- needs a superuser/owner role
```

Then `backend/.env` (copy from `.env.example`):

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/localpulse
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=<generated>
```

### Running

```bash
# backend
cd backend
.venv/Scripts/activate
alembic upgrade head        # apply migrations (0001..0004)
uvicorn app.main:app --reload
# seed (also runs automatically on startup in development)
python -m app.db.seed

# frontend
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api and /ws to :8000)
```

Demo accounts (password `password123`): `demo@localpulse.dev`,
`provider@localpulse.dev`, `society@localpulse.dev`.

## 8. Deviations & decisions (flagged)

1. **`localities` router added** — signup needs a public locality picker
   endpoint; the brief's v1 list didn't include it.
2. **Icons = Material Symbols** — the brief suggested Lucide/Phosphor, but the
   ground-truth mockups use Material Symbols consistently; Section 8 (mockups
   win on visual/UX) takes precedence. No emoji anywhere.
3. **`urgent` field on feed posts** — the screen-03 composer has an urgent
   toggle; the spec data model didn't list it (mockup wins on UX).
4. **Redis optional in dev** — see §2 (user-approved).
5. **Phone OTP stub** — `/auth/verify-phone` accepts any 6-digit code outside
   production and **fails closed (501) in production**; swap in an SMS provider
   behind the same contract.
6. **Call/Message replaced by View profile** on provider cards — there is no
   telephony/DM infra in scope; provider detail shows all contact-adjacent info.
7. **`server_default="0"` / `"3.0"` strings** in models are intentionally
   SQLAlchemy-rendered literals on Postgres; migrations carry the same defaults.
