# Aas-Paas — Data Model

> **Status: Placeholder**
> The full database schema will be defined in the Stage 1 product implementation prompt.

## Planned Tables

The following is the intended schema architecture. Migration files will be created in `supabase/migrations/` during Stage 1.

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile, trust score, location (extends Supabase `auth.users`) |
| `posts` | All three module posts (nearby / help / need) via `module` discriminator |
| `post_confirmations` | Community confirmations for Nearby and Help posts |
| `trust_records` | Trust signal records per user (email_verified, admin_verified, etc.) |
| `notifications` | In-app notification records (now with `actor_id`) |
| `moderation_reports` | User-reported content |
| `conversations` | Direct + group conversations |
| `conversation_members` | Membership + role per conversation (owner/admin/member) |
| `messages` | Chat messages, ordered by `created_at` |
| `message_reads` | Per-user last-read watermark per conversation (drives unread counts) |

### Messaging (`supabase/migrations/20240101000001_messaging.sql`)

The schema mirrors the app's local data layer (`src/lib/db/local-db.ts`) so the
feature can move server-side without a rewrite. Key rules:

- **RLS** — users only see conversations they belong to, can only send messages
  into conversations they are members of, and can only modify group settings as
  owner/admin (helper: `is_conversation_member`).
- **Unread counts** — `message_reads.last_read_at` is the watermark; messages
  newer than the watermark from other users count as unread.
- **Realtime** — conversations, members, messages, message_reads and
  notifications are published to `supabase_realtime`.
- **Notifications** — the existing `notifications` table gains `actor_id`
  (the user who triggered the event) for rendering actor avatars.

### PostGIS

All geographic columns use PostGIS `GEOGRAPHY(POINT, 4326)`.
Spatial indexes on post location for fast radius queries.

### RLS Policies

Every table will have Row Level Security enabled before data is inserted.

### Regenerating Types

After applying migrations, regenerate TypeScript types:

```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```

Never manually maintain `database.types.ts` column types long-term.
