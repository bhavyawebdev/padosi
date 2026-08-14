import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

/**
 * GET /auth/callback
 *
 * Handles two Supabase redirect flows:
 *
 * 1. OAuth (PKCE): after Google sign-in, Supabase appends `?code=...` — never
 *    `#access_token=...` — to this URL. We exchange the code for a session.
 * 2. Email links (verification / recovery / invite): Supabase appends
 *    `?token_hash=...&type=...`. We verify the OTP and mark the email
 *    confirmed, then route by `type` (recovery → /reset-password).
 *
 * Tokens are never exposed in the visible URL.
 */

const DEFAULT_NEXT_PATH = '/home'

/** Whitelist of token_hash flows the callback understands. */
const TOKEN_HASH_TYPES = ['email', 'invite', 'recovery', 'email_change'] as const

/**
 * Restrict `next` to internal, relative paths only to prevent open redirects.
 * Anything else (absolute URLs, protocol-relative, backslash tricks) falls back
 * to `/home`.
 */
function safeNextPath(next: string | null): string {
  if (
    next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('://') &&
    !next.includes('\\')
  ) {
    return next
  }
  return DEFAULT_NEXT_PATH
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = safeNextPath(searchParams.get('next'))

  // Redirect back to the origin the user authenticated from. On Vercel (direct
  // deployment, no load balancer) `request.url` is already the public URL, so
  // `origin` is authoritative — never trust a client-supplied x-forwarded-host.
  const redirectWithError = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)

  // OAuth provider reported a failure (e.g. user cancelled at Google).
  if (error) {
    return redirectWithError(errorDescription || 'Authentication failed. Please try again.')
  }

  try {
    const supabase = await createClient()

    // ---- Flow 2: email link (token_hash) ----------------------------------
    if (tokenHash && type && TOKEN_HASH_TYPES.includes(type as (typeof TOKEN_HASH_TYPES)[number])) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email' | 'invite' | 'recovery' | 'email_change',
      })

      if (verifyError) {
        // Expired / already-used / invalid links all land here with a
        // user-friendly message on the login page.
        return redirectWithError('This verification link is invalid or has expired. Please sign in and request a new one.')
      }

      // Recovery links should land the user on the reset-password page (the
      // session is already established by verifyOtp).
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Email-confirmation links: greet the (now verified) user. Fire-and-
      // forget so a slow email provider never blocks the redirect.
      if (type === 'email') {
        const {
          data: { user: verifiedUser },
        } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        const email = verifiedUser?.email ?? ''
        const fullName =
          (verifiedUser?.user_metadata?.full_name as string | undefined) || email || 'there'
        if (email) {
          void sendWelcomeEmail(email, fullName)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    // ---- Flow 1: OAuth PKCE (?code=...) -----------------------------------
    if (!code) {
      return redirectWithError('Invalid authentication callback. Please try again.')
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return redirectWithError(exchangeError.message || 'Sign-in failed. Please try again.')
    }

    // Verify the session actually exists before redirecting.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return redirectWithError('Authentication failed. Please try again.')
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch {
    return redirectWithError('Something went wrong during authentication. Please try again.')
  }
}
