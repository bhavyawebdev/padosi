# Padosi

A hyperlocal community platform connecting individuals, local businesses, and residential
communities. Every feature answers one question: *"Is this happening near me, right now, and
can I trust it?"*

> **Rebrandable:** "Padosi" is a working name. It appears only in branding/config files,
> never in feature logic.

## Features

| Module | What it is |
|---|---|
| **Nearby Right Now** | Live, short-lived, geotagged local feed (traffic, civic issues, utilities, events). Posts auto-expire and are only visible within a radius. Real-time via WebSocket. |
| **Verified Help** | Community-verified local service directory (cooks, tutors, plumbers…). Trust shown as "Verified by N neighbors", not vague star averages. |
| **Need It Now** | Urgent walking-distance request board: borrow/lend, ride shares, spare tickets. Per-post chat threads, prominent distance badges. |
| **Search** | One box across all three modules — finds alerts, requests, and providers near you (`/search`). |
| **Save & share** | Bookmark posts/requests/providers (`/saved`, device-local) and share any alert via the native share sheet or clipboard. |
| **Dark mode** | System-aware light/dark theme with a header toggle (persisted). |
| **Notifications** | Header bell with unread badge — replies, confirms, and reviews deep-link to the source. |
| **Locality switcher** | Browse another locality's feed/requests/directory from the header (desktop) or feed page (mobile). |
| **Post detail page** | Dedicated URL per alert (`/posts/:id`) — shareable, with confirm/resolve/report actions. |
| **Installable PWA** | Manifest + generated icons + network-first service worker (production only; dev never caches). |
| **User-to-user chat** | Private neighbour inbox (`/messages`) with unread badges — Message buttons on posts and requests. Accepting a booking opens a chat automatically. |
| **AI assistant** | Floating helper chat bubble — finds providers, live posts and open requests near you, and answers how-to questions (no external AI key needed). |
| **Area map** | Grounded Leaflet/OpenStreetMap view (`/map`) of nearby pulses, requests and providers with distance chips and detail popups. |
| **Service bookings** | In-app contact requests on provider profiles; providers accept/decline from a bookings inbox on their profile (`/directory/bookings`). |
| **Admin console** | A dedicated, separate admin experience (`/admin`) — own sidebar layout, no customer nav. Platform super-admin + locality-scoped society dashboards with Recharts analytics and moderation. |

## Stack

- **Frontend:** React 19 + TypeScript (strict) + Vite + Tailwind CSS v4 + TanStack Query + WebSocket
- **Backend:** FastAPI (async) + SQLAlchemy 2 (async) + Alembic + Pydantic v2
- **Data:** PostgreSQL + PostGIS (radius queries via `ST_DWithin`), Redis (cache / Celery broker / WS pub-sub), Celery (expiry sweeps, notifications)

## Repository layout

```
├── frontend/          React + Vite app (design tokens in src/styles/theme.css)
├── backend/           FastAPI app (app/api/v1, app/services/geo_engine.py, app/workers/)
├── docs/              ARCHITECTURE.md, API_CONTRACTS.md
└── design-reference/  Ground-truth UI mockups (Google Stitch) — source of truth for styling
```

## Quick start

### Option A — Docker (easiest)

```bash
docker compose up -d            # Postgres + PostGIS + Redis
```

### Option B — Local installs / managed services

See `docs/ARCHITECTURE.md` §Infrastructure for Postgres+PostGIS and Redis options
(local install or managed). Copy `backend/.env.example` → `backend/.env` and set the URLs.

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows
pip install -r requirements.txt
alembic upgrade head            # apply migrations
uvicorn app.main:app --reload   # http://localhost:8000, docs at /docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### Production Docker deployment

```bash
docker compose -f docker-compose.prod.yml up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:4173`

> Ensure `backend/.env` exists before bringing up production containers.

## Demo accounts (dev seed)

Created automatically on backend startup in development (or via `python -m app.db.seed`).
All share the password `password123`:

| Email | Role | Notes |
|---|---|---|
| `demo@localpulse.dev` | individual | regular neighbor |
| `provider@localpulse.dev` | business | owner of the demo cook profile |
| `society@localpulse.dev` | community | posts official society notices; can open `/admin` for the society dashboard |
| `admin@localpulse.dev` | admin | platform admin console at `/admin` (users, moderation, analytics) |

## Documentation

- `docs/ARCHITECTURE.md` — system design, data model, geo engine, realtime flow
- `docs/API_CONTRACTS.md` — every endpoint (method, path, request/response schema, errors)

## Security & privacy

- **Secure auth** — JWTs carry a server-side token version; `logout` and password changes invalidate every issued session instantly.
- **Forgot password / forgot email** — one-time hashed reset tokens (expiring, single-use) + phone-based email recovery (full email in dev, masked in production).
- **Login protection** — per-email lockout after 5 failed attempts (15 min) + per-IP rate limit; every login is audited in a session history.
- **Privacy controls in the profile** — change password (signs out other devices), "recent sign-ins" audit list, "sign out all other devices", and a "keep me signed in" toggle on login (session-only storage when off).
- **Show/hide password + live strength meter** on every password field (login, signup, reset, change).

## Deployment

This repository contains two frontends. Decide which one you are deploying:

### 1. Supabase SPA (repo root) — deploy to Vercel

The Vite app at the **repo root** (`src/`, `package.json`) is a self-contained
SPA backed by **Supabase** (auth, Postgres, storage). It deploys directly to
Vercel as a static site — no server needed.

- **Framework preset:** Vite (auto-detected)
- **Build command:** `npm run build` (runs `tsc -b && vite build`)
- **Output directory:** `dist`
- **SPA routing:** `vercel.json` rewrites all paths to `/index.html`, so direct
  navigation to `/login`, `/nearby`, `/help`, `/admin`, etc. never 404s.
- **Environment variables** (set in Vercel → Project → Settings → Environment
  Variables):
  - `VITE_SUPABASE_URL` — Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key (browser-safe)

> `VITE_*` vars are inlined at build time — set them **before** the build runs
> (or trigger a redeploy after adding them). The anon key is safe to ship to
> the browser; never expose the `service_role` key (it is only used by
> `scripts/seed-supabase.mjs` via `SUPABASE_SERVICE_ROLE_KEY`, dev-only).

### 2. FastAPI full-stack app (`frontend/` + `backend/`) — host the backend separately

The `frontend/` app talks to the FastAPI backend (`backend/`) over REST
(`/api/v1`) and WebSocket (`/ws`). The backend needs **PostgreSQL + PostGIS**,
**Redis** (cache / Celery broker / WS pub-sub) and **Celery** workers — this
stack **cannot run on Vercel serverless**. Deploy the backend on a platform
with persistent processes (Render, Railway, Fly.io, a VPS, or the included
`docker-compose.prod.yml`) and host the SPA on Vercel with:

- **Build command:** `npm run build` (run inside `frontend/`)
- **Output directory:** `frontend/dist`
- **Environment variable:** `VITE_API_URL` — the deployed backend's API base,
  e.g. `https://api.example.com/api/v1` (defaults to `/api/v1`, same-origin).

Backend requirements (`backend/.env.prod.example`):

| Variable | Purpose |
|---|---|
| `APP_ENV` | `production` disables dev conveniences (seed data) |
| `DATABASE_URL` | `postgresql+asyncpg://…` Postgres with **PostGIS** extension |
| `REDIS_URL` | Redis instance (cache, Celery broker, WS pub-sub) |
| `JWT_SECRET` | **Set a long random value in production** |
| `CORS_ORIGINS` | Must include the SPA origin, e.g. `https://yourapp.vercel.app` |
| `SEED_DEMO_DATA` | `false` in production |

Run migrations before first start: `alembic upgrade head`, then launch
`uvicorn app.main:app` plus the Celery worker/beat (see `docs/ARCHITECTURE.md`).
The live-feed WebSocket connects to the **same host** as the SPA
(`<origin>/ws/feed`), so route `/ws` to the backend via a reverse proxy
(nginx/gateway) or disable realtime (feed still works via polling).

## Engineering standards (non-negotiable)

1. TypeScript strict; Pydantic v2 on every endpoint — no `any`, no raw dicts.
2. No silent failures — every API call handles loading/error/empty states (React Query).
3. No hardcoded secrets/URLs — `.env` + `.env.example` only.
4. Every schema change via Alembic migration.
5. Geo queries use PostGIS functions (`ST_DWithin`), never manual lat/lng math in Python.
6. Redis-backed rate limiting on post-creation.
7. Accessibility basics: semantic HTML, contrast-safe palette, keyboard-navigable forms.
