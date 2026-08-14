# Aas-Paas

**Your neighbourhood, connected. — आपका पड़ोस, जुड़ा हुआ।**

Aas-Paas is a hyperlocal community web application designed for Indian neighbourhoods and mohalla culture. It connects people within walking distance through three focused modules:

| Module | Color | Purpose |
|---|---|---|
| 🟤 **Nearby Right Now** | Terracotta | Share what's happening near you right now |
| 🟢 **Verified Help** | Sage Green | Community-verified help offers and services |
| 🟡 **Need It Now** | Marigold | Urgent requests to your neighbours |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + custom CSS variables |
| Auth | Supabase Auth (email + password, optional Google OAuth) |
| Database | Supabase (PostgreSQL + PostGIS) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (selective) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Testing | Vitest + Testing Library + Playwright |
| Deployment | Vercel (free/hobby) |

**Free-first architecture** — no paid SMS, no paid map API, no paid analytics required.

---

## Folder Structure

```
aas-paas/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (marketing)/     # Landing page (unauthenticated)
│   │   ├── (auth)/          # Auth flow (sign in/up/verify)
│   │   ├── (onboarding)/    # Profile + location setup
│   │   ├── (app)/           # Main app shell (authenticated)
│   │   └── api/             # API route handlers
│   ├── components/
│   │   ├── ui/              # Base UI primitives (Button, Input, Card…)
│   │   ├── navigation/      # DesktopSidebar, MobileBottomBar, CreateFab
│   │   ├── modules/         # ModuleBadge, ModuleCard
│   │   ├── cards/           # DistanceLabel, ExpiryLabel
│   │   ├── trust/           # TrustBadge, VerificationBadge
│   │   ├── forms/           # Form components
│   │   ├── location/        # Location picker components
│   │   └── maps/            # Map components (V1.1)
│   ├── features/            # Product feature domains
│   │   ├── auth/            # Auth actions and hooks
│   │   ├── profile/         # Profile management
│   │   ├── nearby/          # Nearby Right Now
│   │   ├── help/            # Verified Help
│   │   ├── need/            # Need It Now
│   │   ├── location/        # Location engine
│   │   ├── notifications/   # In-app notifications
│   │   └── moderation/      # Content moderation
│   ├── lib/
│   │   ├── supabase/        # Browser, server, admin clients + proxy
│   │   ├── geo/             # Location engine (Browser Geolocation API)
│   │   ├── expiry/          # Post TTL engine
│   │   ├── trust/           # Trust scoring engine
│   │   ├── auth/            # Auth helpers + route guards
│   │   ├── validation/      # Zod schemas
│   │   ├── security/        # Security utilities
│   │   ├── rate-limit/      # Rate limiting
│   │   ├── notifications/   # Notification helpers
│   │   ├── constants/       # App-wide constants
│   │   └── utils/           # General utilities
│   ├── types/
│   │   ├── database.types.ts  # Supabase-generated (regenerate from schema)
│   │   ├── domain.ts          # App-level domain types
│   │   └── api.ts             # API request/response contracts
│   └── config/
│       ├── site.ts            # Site metadata
│       ├── navigation.ts      # Nav items
│       └── modules.ts         # Module color/label map
├── supabase/
│   ├── config.toml          # Local Supabase dev config
│   ├── migrations/          # Database migration files
│   ├── functions/           # Supabase Edge Functions
│   └── seed.sql             # Local dev seed data
├── tests/
│   ├── unit/                # Vitest unit tests
│   ├── integration/         # Vitest integration tests
│   └── e2e/                 # Playwright E2E tests
└── docs/                    # Architecture documentation
```

---

## Local Development Setup

### Prerequisites

- **Node.js** v20+ (v24 recommended)
- **npm** v10+
- **Supabase CLI** (optional, for local DB): `npm install -g supabase`

### 1. Clone and install

```bash
git clone https://github.com/your-org/aas-paas.git
cd aas-paas
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Setup

### Cloud (Recommended for development)

1. Create a free project at [supabase.com](https://supabase.com)
2. Copy the **Project URL** and **anon public key** from Settings → API
3. Enable **Email Auth** in Authentication settings
4. (Optional) Enable Google OAuth if needed

### Local (Docker)

```bash
# Start local Supabase stack
npx supabase start

# Apply migrations
npx supabase db push

# Stop
npx supabase stop
```

### Database Migrations

```bash
# Create a new migration
npx supabase migration new <migration_name>

# Apply pending migrations to local DB
npx supabase db push

# Generate TypeScript types from schema
npx supabase gen types typescript --linked > src/types/database.types.ts
```

---

## Authentication

MVP uses **email + password** via Supabase Auth.

Future additions (no rewrite needed):
- Google OAuth (stub already in place)
- Phone OTP (extensible — no schema change needed)

---

## Location

MVP uses the **Browser Geolocation API** — no paid map service required.

Users who deny location permission can manually enter their neighbourhood.

The architecture supports adding Mapbox or Leaflet as a map overlay in V1.1.

---

## Commands

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript type check
npm test             # Vitest unit + integration tests
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright interactive UI
```

---

## What's Implemented (Stage 0)

- ✅ Next.js 16 + TypeScript + Tailwind CSS v4
- ✅ App Router with route groups: (marketing), (auth), (onboarding), (app)
- ✅ Aas-Paas design system (terracotta/sage/marigold tokens)
- ✅ Responsive app shell (desktop sidebar + mobile bottom bar)
- ✅ Supabase auth clients (browser, server, admin, proxy middleware)
- ✅ Shared engines: geo, expiry, trust (free-first, no paid services)
- ✅ Shared UI components: Button, Input, Textarea, Badge, Card, Avatar, Skeleton, Alert
- ✅ Module components: ModuleBadge, ModuleCard
- ✅ Trust components: TrustBadge, VerificationBadge
- ✅ Page placeholders for all routes
- ✅ API stubs (health + 501 placeholders)
- ✅ Vitest + Playwright configured
- ✅ CI workflow (GitHub Actions)
- ✅ Supabase config.toml

## What's NOT Implemented Yet (Stage 1)

- ❌ Database schema + migrations
- ❌ OTP / email auth interactive forms
- ❌ Real post creation / reading
- ❌ Location picker
- ❌ Feed and ranking
- ❌ Trust scoring (DB-backed)
- ❌ Realtime notifications
- ❌ Map UI
- ❌ Full moderation
- ❌ Full expiry engine (server-side)
