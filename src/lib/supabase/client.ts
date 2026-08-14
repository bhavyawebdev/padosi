import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client (PKCE flow — forced by @supabase/ssr).
 *
 * Returns `null` when the public env vars are missing so callers can surface a
 * friendly "not configured" message instead of crashing the whole app at render
 * time (createBrowserClient throws on missing credentials).
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.error(
      'Aas-Paas: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required. Check .env.local / Vercel environment variables.'
    )
    return null
  }

  return createBrowserClient(url, anonKey)
}
