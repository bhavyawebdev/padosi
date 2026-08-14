import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview
 * Dashboard statistics computed from the real database. Requires an
 * authenticated admin/moderator session (server-side check).
 */
export async function GET() {
  const auth = await requireRole("moderator");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role key not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const [users, verifiedUsers, posts, comments, groups, openReports, blocks] =
      await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("email_verified", true),
        admin.from("posts").select("id", { count: "exact", head: true }),
        admin
          .from("post_comments")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        admin.from("groups").select("id", { count: "exact", head: true }),
        admin
          .from("reports")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "reviewing"]),
        admin.from("blocks").select("id", { count: "exact", head: true }),
      ]);

    // Recent moderation activity.
    const { data: recentActivity, error: activityError } = await admin
      .from("audit_logs")
      .select("id, action, actor_role, target_type, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: {
        users: users.count ?? 0,
        verifiedUsers: verifiedUsers.count ?? 0,
        pendingVerification: Math.max((users.count ?? 0) - (verifiedUsers.count ?? 0), 0),
        posts: posts.count ?? 0,
        comments: comments.count ?? 0,
        groups: groups.count ?? 0,
        openReports: openReports.count ?? 0,
        blockedUsers: blocks.count ?? 0,
      },
      recentActivity: activityError ? [] : recentActivity,
    });
  } catch (err) {
    console.error("Aas-Paas: admin overview failed", err);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
