import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { getAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/admin/audit";
import { createProductionNotification } from "@/lib/notifications/production";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"];
const TARGET_TABLES: Record<string, string> = {
  post: "posts",
  comment: "post_comments",
  user: "profiles",
  message: "messages",
  group: "groups",
};

/** GET /api/admin/reports?status=open */
export async function GET(request: NextRequest) {
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

  const status = new URL(request.url).searchParams.get("status") ?? "open";
  const statuses = status === "all" ? REPORT_STATUSES : [status];

  try {
    const { data, error } = await admin
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, description, status, created_at")
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: "Failed to load reports." }, { status: 500 });
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (err) {
    console.error("Aas-Paas: admin reports list failed", err);
    return NextResponse.json({ error: "Failed to load reports." }, { status: 500 });
  }
}

type ModerationAction =
  | { action: "dismiss"; reason?: string }
  | { action: "resolve"; reason?: string }
  | { action: "remove_content"; reason?: string }
  | { action: "restore_content"; reason?: string }
  | { action: "suspend_user"; reason?: string }
  | { action: "disable_user"; reason?: string }
  | { action: "warn_user"; reason?: string };

/** POST /api/admin/reports — apply a moderation action to a report. */
export async function POST(request: NextRequest) {
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

  let body: { reportId: string } & ModerationAction;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const reportId = body.reportId;
  if (!reportId || !/^[0-9a-f-]{36}$/i.test(reportId)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  }

  try {
    const { data: report } = await admin
      .from("reports")
      .select("id, target_type, target_id, status")
      .eq("id", reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const targetTable = TARGET_TABLES[report.target_type];

    // Resolve the target's owner so we can notify / moderate the right user.
    let ownerId: string | null = null;
    if (targetTable) {
      const { data: targetRow } = await admin
        .from(targetTable as "posts")
        .select("author_id, user_id, created_by, sender_id, id")
        .eq("id", report.target_id)
        .maybeSingle();
      if (targetRow) {
        ownerId =
          (targetRow as { author_id?: string | null }).author_id ??
          (targetRow as { user_id?: string | null }).user_id ??
          (targetRow as { created_by?: string | null }).created_by ??
          (targetRow as { sender_id?: string | null }).sender_id ??
          null;
      }
    }

    const moderationAction = body.action;
    const reason = body.reason;

    switch (moderationAction) {
      case "dismiss": {
        await admin.from("reports").update({ status: "dismissed", reviewed_by: auth.userId, reviewed_at: now }).eq("id", reportId);
        break;
      }
      case "resolve": {
        await admin.from("reports").update({ status: "resolved", reviewed_by: auth.userId, reviewed_at: now }).eq("id", reportId);
        break;
      }
      case "remove_content": {
        if (targetTable === "profiles") {
          await admin.from("profiles").update({ status: "disabled" }).eq("id", report.target_id);
        } else {
          // Soft-delete the content so the user can be restored later.
          await admin
            .from(targetTable as "posts")
            .update(
              targetTable === "post_comments"
                ? { deleted_at: now }
                : targetTable === "posts"
                  ? { status: "removed" }
                  : { updated_at: now }
            )
            .eq("id", report.target_id);
        }
        await admin.from("reports").update({ status: "resolved", reviewed_by: auth.userId, reviewed_at: now }).eq("id", reportId);
        break;
      }
      case "restore_content": {
        if (targetTable === "profiles") {
          await admin.from("profiles").update({ status: "active" }).eq("id", report.target_id);
        } else {
          await admin
            .from(targetTable as "posts")
            .update(
              targetTable === "post_comments"
                ? { deleted_at: null }
                : targetTable === "posts"
                  ? { status: "published" }
                  : { updated_at: now }
            )
            .eq("id", report.target_id);
        }
        break;
      }
      case "suspend_user": {
        if (ownerId) await admin.from("profiles").update({ status: "suspended" }).eq("id", ownerId);
        await admin.from("reports").update({ status: "resolved", reviewed_by: auth.userId, reviewed_at: now }).eq("id", reportId);
        break;
      }
      case "disable_user": {
        if (ownerId) await admin.from("profiles").update({ status: "disabled" }).eq("id", ownerId);
        await admin.from("reports").update({ status: "resolved", reviewed_by: auth.userId, reviewed_at: now }).eq("id", reportId);
        break;
      }
      case "warn_user": {
        if (ownerId) {
          await createProductionNotification({
            recipientId: ownerId,
            actorId: auth.userId,
            type: "moderation",
            title: "A moderation note",
            content: reason || "A member of our moderation team reviewed your activity.",
          });
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    await logAudit(
      {
        actorId: auth.userId,
        actorRole: auth.role,
        action: `moderation.${moderationAction}`,
        targetType: "report",
        targetId: reportId,
        reason,
        metadata: { targetType: report.target_type, targetId: report.target_id },
      },
      admin
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Aas-Paas: admin moderation action failed", err);
    return NextResponse.json({ error: "Failed to process the report." }, { status: 500 });
  }
}
