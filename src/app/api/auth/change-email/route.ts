import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { throttle } from "@/lib/rate-limit";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Change the email address of the current (unverified) account. Requires an
 * authenticated session — the session is bound to the account, so only the
 * account owner can change their own email.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const limit = throttle(`change-email:${user.id}`, 3, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 }
    );
  }

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${APP_URL}/auth/callback?next=/home` }
  );

  if (error) {
    return NextResponse.json({ error: "Couldn't update the email. Please try again." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
