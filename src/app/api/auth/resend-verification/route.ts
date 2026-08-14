import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { throttle } from "@/lib/rate-limit";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Resend the signup verification email. Server-side so the client never
 * touches auth internals, and rate-limited to prevent email-bombing.
 */
export async function POST(request: NextRequest) {
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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = throttle(`resend-verification:${email}:${ip}`, 3, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You've requested too many emails. Please wait a few minutes." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback?next=/home`,
    },
  });

  // Deliberately respond success for unknown emails too (no account probing).
  if (error && !/not.*found|no.*user/i.test(error.message)) {
    return NextResponse.json({ error: "Couldn't send the email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
