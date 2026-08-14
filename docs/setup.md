# Aas-Paas — Local Setup

## Requirements

| Tool | Version |
|---|---|
| Node.js | v20+ (v24 recommended) |
| npm | v10+ |
| Supabase CLI | Optional, for local DB |
| Git | Any recent version |

Check Node.js version:
```bash
node --version
```

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the "anon public" key
- `SUPABASE_SERVICE_ROLE_KEY` — the "service_role" key (keep secret!)
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for local dev
- `CRON_SECRET` — a long random string; required for the Vercel cleanup cron
- `EMAIL_VALIDATION_API_KEY` / `EMAIL_VALIDATION_API_URL` — optional signup email-validation provider

## 3. Supabase Setup

### Option A — Supabase Cloud (Easiest)
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to Authentication → Email → enable "Confirm email"
3. Copy API keys to `.env.local`

### Option B — Local Supabase (Docker required)
```bash
npx supabase start       # Start local stack
npx supabase db push     # Apply migrations
npx supabase stop        # Stop when done
```

## 4. Run locally

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## 5. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript check |
| `npm test` | Vitest unit + integration tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E (requires dev server) |

## 6. Database Migrations

```bash
# Create a new migration
npx supabase migration new <name>

# Regenerate TypeScript types after schema changes
npx supabase gen types typescript --linked > src/types/database.types.ts

# Apply migrations to the linked project (production schema + RLS + realtime)
npx supabase db push
```

## 7. Production rollout checklist

1. `npx supabase db push` — apply `20240101000002_production.sql` (all tables, RLS, triggers, realtime publication)
2. In Supabase Dashboard → Authentication → Providers → Google: ensure the redirect URL includes `https://<vercel-url>/auth/callback`
3. Promote the first admin: `UPDATE public.profiles SET role = 'super_admin' WHERE id = '<your-auth-user-id>';`
4. In Vercel → Project → Settings → Cron Jobs: the `vercel.json` cron calls `/api/cron/cleanup-unverified` hourly with `Authorization: Bearer $CRON_SECRET`
5. After applying the migration, the app's production data layer (`src/lib/data/production.ts`) becomes the source of truth; the local/demo layer remains the fallback until then

## 8. What does NOT need setup

- No Mapbox account required (location works with Browser Geolocation API)
- No SMS provider required (auth uses email for MVP)
- No analytics setup required
- No paid services required for development
