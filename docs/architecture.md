# Aas-Paas Architecture

## Overview

Aas-Paas uses Next.js 16 App Router with a clear separation between:
- **Route groups** (`src/app/`) for page structure
- **Feature domains** (`src/features/`) for business logic
- **Shared infrastructure** (`src/lib/`) for reusable engines
- **UI components** (`src/components/`) for presentation

---

## Route Groups

| Group | Path prefix | Purpose |
|---|---|---|
| `(marketing)` | `/` | Landing page — no auth required |
| `(auth)` | `/auth/*` | Sign in / sign up / verify email |
| `(onboarding)` | `/onboarding/*` | New user profile + location setup |
| `(app)` | `/home`, `/nearby`, `/help`, `/need`, `/create`, `/profile`… | Main authenticated app |

Route groups use parentheses `(group)` to share layouts without affecting the URL.

---

## Shared Engines (Location + Expiry + Trust)

All three product modules share the same three engines:

```
src/lib/geo/          ← Location Engine
src/lib/expiry/       ← Expiry Engine
src/lib/trust/        ← Trust Engine
```

These are NOT duplicated per module. Nearby, Help, and Need all import from the same engines.

### Location Engine (`lib/geo/`)
- Uses Browser Geolocation API — no paid API required
- Falls back to manual neighbourhood entry
- Exposes only approximate distances (bucketed: 200m / 400m / 800m / 1.5km / 5km)
- PostGIS handles server-side geographic queries
- A map UI provider (Mapbox/Leaflet) can be added as a V1.1 overlay

### Expiry Engine (`lib/expiry/`)
- Different TTL defaults per module (Nearby: 24h, Help: 7d, Need: 48h)
- Expiry stored in Supabase, enforced server-side
- Client gets `expiresAt` ISO string and uses `expiryLabel()` for display

### Trust Engine (`lib/trust/`)
- Free-MVP signals: email_verified, account_age, community_confirm, neighbour_rec, society_verified, request_fulfilled, admin_verified
- Phone OTP is addable as a future signal without rewriting the engine
- Never shows a badge without a real underlying DB record

---

## Three-Module Rule

Every post belongs to exactly one module:

```
nearby  →  Nearby Right Now   (terracotta / primary)
help    →  Verified Help       (sage green / secondary)
need    →  Need It Now         (marigold / tertiary)
```

No fourth module. Subtypes exist inside modules (e.g. "urgent" within Need).

---

## Feature Domains (`src/features/`)

| Feature | Contents |
|---|---|
| `auth` | Server Actions: signIn, signUp, signOut, verifyEmail |
| `profile` | Profile update, avatar upload |
| `nearby` | Create/read Nearby posts |
| `help` | Create/read Help listings, verification |
| `need` | Create/read Need requests, fulfilment |
| `location` | Location picker, neighbourhood selection |
| `notifications` | In-app notification CRUD |
| `moderation` | Report, review, remove |

Each feature is self-contained: actions + hooks + types live together.

---

## Supabase

### Clients

| Client | File | Usage |
|---|---|---|
| Browser | `lib/supabase/client.ts` | Client Components |
| Server | `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| Admin | `lib/supabase/admin.ts` | Trusted server-only contexts (bypasses RLS) |
| Proxy | `lib/supabase/proxy.ts` | Session refresh in Next.js middleware |

### Session Middleware

`proxy.ts` (root) runs on every request to refresh the Supabase auth session token. It does NOT perform authorization — that is done per route/component.

### RLS (Row Level Security)

- All tables have RLS enabled
- Policies enforce that users can only read/write their own data
- Admin client bypasses RLS — only used in trusted server contexts

---

## Design System

CSS custom properties in `src/app/globals.css`.

Module colors:
```css
--module-nearby  = var(--color-primary)          /* Terracotta */
--module-help    = var(--color-secondary)         /* Sage Green */
--module-need    = var(--color-tertiary)          /* Marigold */
```

Typography:
- Headings + labels: **Plus Jakarta Sans**
- Body + user content: **Noto Sans** (with Noto Sans Devanagari for Hindi)

The colored left-border treatment (`border-l-4`) is reserved exclusively for the three module cards.

---

## Auth Flow

```
/auth/phone  →  Email + password sign in / sign up
/auth/verify →  Check email confirmation screen
/onboarding/profile  →  Set display name + avatar
/onboarding/location →  Set neighbourhood (browser geo or manual)
/home        →  Main app
```

Phone OTP can be added as an additional step in `/auth/phone` without restructuring.
