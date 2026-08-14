import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/email-validation";
import { throttle } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Server-side email validation before signup. Never reveals provider keys. */
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
  const limit = throttle(`validate-signup:${ip}:${email}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  const result = await validateEmail(email);

  if (!result.valid) {
    const friendly =
      result.reason === "disposable"
        ? "Please use a permanent email address — temporary mail providers aren't allowed."
        : "That email address doesn't look valid. Please check it.";
    return NextResponse.json({ valid: false, error: friendly }, { status: 200 });
  }

  return NextResponse.json({ valid: true, email: result.normalizedEmail }, { status: 200 });
}
