import { NextRequest, NextResponse } from "next/server";
import { requireRole, type UserRole, type ProfileStatus } from "@/lib/auth/roles";
import { getAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES: UserRole[] = ["user", "moderator", "admin", "super_admin"];
const VALID_STATUSES: ProfileStatus[] = ["active", "suspended", "disabled"];

/** GET /api/admin/users?search=&role=&status=&page= */
export async function GET(request: NextRequest) {
  const auth = await requireRole("admin");
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

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const perPage = 25;

  try {
    let query = admin
      .from("profiles")
      .select(
        "id, email, full_name, username, avatar_url, neighbourhood, city, role, status, email_verified, created_at, last_seen_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (role && VALID_ROLES.includes(role as UserRole)) {
      query = query.eq("role", role);
    }
    if (status && VALID_STATUSES.includes(status as ProfileStatus)) {
      query = query.eq("status", status);
    }
    if (search) {
      // Never allow the browser to inject SQL — parameterized filters only.
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
    }

    return NextResponse.json({
      users: data ?? [],
      total: count ?? 0,
      page,
      perPage,
    });
  } catch (err) {
    console.error("Aas-Paas: admin user list failed", err);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}

type UserAction =
  | { action: "suspend"; reason?: string }
  | { action: "unsuspend"; reason?: string }
  | { action: "disable"; reason?: string }
  | { action: "restore"; reason?: string }
  | { action: "change_role"; role: UserRole; reason?: string };

/** PATCH /api/admin/users/[id] — suspend/unsuspend/disable/restore/role. */
export async function PATCH(request: NextRequest) {
  // Suspension etc. needs admin; changing roles needs super_admin.
  const auth = await requireRole("admin");
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

  const url = new URL(request.url);
  const targetId = url.pathname.split("/").pop();
  if (!targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: UserAction;
  try {
    body = (await request.json()) as UserAction;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Only super_admins may grant or change roles; nobody may modify their own
  // account through this endpoint.
  if (body.action === "change_role" || targetId === auth.userId) {
    if (body.action === "change_role") {
      const superCheck = await requireRole("super_admin");
      if (!superCheck.ok) {
        return NextResponse.json(
          { error: "Only super admins can change roles." },
          { status: superCheck.status }
        );
      }
    }
    if (targetId === auth.userId) {
      return NextResponse.json(
        { error: "You cannot change your own account here." },
        { status: 400 }
      );
    }
  }

  if (body.action === "change_role" && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    // Read the target's current row for audit context.
    const { data: target } = await admin
      .from("profiles")
      .select("role, status, full_name, email")
      .eq("id", targetId)
      .single();

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updates: Record<string, string> = {};
    let action: string;
    let reason: string | undefined;

    switch (body.action) {
      case "suspend":
        updates.status = "suspended";
        action = "user.suspend";
        reason = body.reason;
        break;
      case "unsuspend":
        updates.status = "active";
        action = "user.unsuspend";
        reason = body.reason;
        break;
      case "disable":
        updates.status = "disabled";
        action = "user.disable";
        reason = body.reason;
        break;
      case "restore":
        updates.status = "active";
        action = "user.restore";
        reason = body.reason;
        break;
      case "change_role":
        updates.role = body.role;
        action = "user.change_role";
        reason = body.reason;
        break;
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", targetId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }

    await logAudit(
      {
        actorId: auth.userId,
        actorRole: auth.role,
        action,
        targetType: "user",
        targetId,
        reason,
        metadata: {
          fromRole: target.role,
          toStatus: updates.status,
          fromStatus: target.status,
          toRole: updates.role,
        },
      },
      admin
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Aas-Paas: admin user action failed", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
