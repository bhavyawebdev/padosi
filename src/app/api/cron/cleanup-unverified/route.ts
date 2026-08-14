import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

const UNVERIFIED_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Scheduled cleanup of unverified email accounts (Phase 4).
 *
 * - NEVER runs in the browser: it is triggered by a Vercel cron
 *   (see vercel.json) and requires the CRON_SECRET bearer token.
 * - Idempotent: each run re-evaluates the same conditions.
 * - Only targets accounts created via email (not Google OAuth) whose email is
 *   still unconfirmed and whose signup is older than 24 hours.
 * - Verified users and recent Google users are never touched.
 *
 * Auth cleanup uses the service-role client — the key is server-only.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";

  if (!expectedSecret || auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 503 }
    );
  }

  const cutoff = new Date(Date.now() - UNVERIFIED_TTL_MS).toISOString();
  const now = new Date().toISOString();
  let removed = 0;
  let scanned = 0;

  try {
    // List users page by page (admin API is paginated, 1000/page).
    let page = 0;
    let nextCursor: string | null = null;
    do {
      const { data, error } = await admin.auth.admin.listUsers({
        page: page + 1,
        perPage: 1000,
      });
      if (error) {
        return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
      }

      for (const u of data.users) {
        scanned += 1;
        // Only email signups.
        const provider = u.app_metadata?.provider;
        if (provider && provider !== "email") continue;
        // Only unconfirmed emails.
        if (u.email_confirmed_at) continue;
        // Only created > 24h ago (created_at is the signup time).
        if (!u.created_at || u.created_at >= cutoff) continue;

        // Remove associated application profile (safe: cascades are explicit).
        await admin.from("profiles").delete().eq("id", u.id);

        // Remove the authentication account (cascades to profile via FK).
        const { error: delError } = await admin.auth.admin.deleteUser(u.id);
        if (!delError) removed += 1;
      }

      nextCursor = data.next ?? null;
      page += 1;
    } while (nextCursor && page < 50); // hard cap to bound runtime

    await admin.from("audit_logs").insert({
      actor_id: null,
      actor_role: "system",
      action: "cleanup_unverified_accounts",
      target_type: "system",
      reason: "Scheduled cleanup of email accounts unverified for 24+ hours",
      metadata: { scanned, removed, cutoff, ranAt: now },
    });

    return NextResponse.json({ ok: true, scanned, removed });
  } catch (err) {
    console.error("Aas-Paas: unverified-account cleanup failed", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
