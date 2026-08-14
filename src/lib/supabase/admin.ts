import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client (service role).
 *
 * ⚠️ SERVER ONLY — this bypasses Row Level Security.
 * - NEVER import this module from a Client Component or anything in the
 *   browser bundle.
 * - NEVER log the key, return it in an API response, or send it to the client.
 * - Only use inside Route Handlers, Server Actions, and cron jobs.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Aas-Paas: SUPABASE_SERVICE_ROLE_KEY is not configured. Admin and cron operations are unavailable."
    );
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Convenience singleton accessor. Always returns null when the env vars are
 * missing so callers can degrade gracefully instead of crashing.
 */
let cached: SupabaseClient | null | undefined;

export function getAdminClient(): SupabaseClient | null {
  if (cached === undefined) {
    cached = createAdminClient();
  }
  return cached;
}
