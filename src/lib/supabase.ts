/**
 * The single Supabase client — the only place createClient is called.
 *
 * Configuration comes from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * (see .env.example). The anon key is safe to ship to the browser; the
 * service-role key must NEVER appear in frontend code.
 *
 * Storage: the "Keep me signed in" toggle on login controls whether the
 * session token lives in localStorage (persistent) or sessionStorage
 * (dies with the tab). The adapter below honours that choice per login.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the browser env has real Supabase credentials. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// When false (the default) the session is persisted in localStorage.
// login(…, remember=false) flips this so the token goes to sessionStorage.
let persistInSessionStorage = false;

/** Called before sign-in: `remember=false` → sessionStorage only. */
export function setSessionPersistence(remember: boolean): void {
  persistInSessionStorage = !remember;
}

/** supabase-js stores the session token under `sb-<project-ref>-auth-token`. */
const AUTH_TOKEN_SUFFIX = "-auth-token";

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY ?? "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => sessionStorage.getItem(key) ?? localStorage.getItem(key),
        setItem: (key, value) => {
          if (persistInSessionStorage) sessionStorage.setItem(key, value);
          else localStorage.setItem(key, value);
          // A login that picks one bucket must evict the token from the other:
          // otherwise a stale localStorage session from an earlier "keep me
          // signed in" login would resurrect after the tab closes (defeating
          // "don't remember me"), or a leftover sessionStorage token would
          // shadow a newer persistent session on reload. The code-verifier
          // key ends in "-auth-token-code-verifier", so the suffix match
          // only touches the session token itself.
          if (key.endsWith(AUTH_TOKEN_SUFFIX)) {
            if (persistInSessionStorage) localStorage.removeItem(key);
            else sessionStorage.removeItem(key);
          }
        },
        removeItem: (key) => {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        },
      },
    },
  },
);
