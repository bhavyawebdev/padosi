import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/audit?page=1 — immutable admin audit trail (admin only). */
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

  const page = Math.max(parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10) || 1, 1);
  const perPage = 25;

  try {
    const { data, error, count } = await admin
      .from("audit_logs")
      .select(
        "id, actor_id, actor_role, action, target_type, target_id, reason, metadata, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to load the audit log." }, { status: 500 });
    }

    return NextResponse.json({
      entries: data ?? [],
      total: count ?? 0,
      page,
      perPage,
    });
  } catch (err) {
    console.error("Aas-Paas: admin audit log failed", err);
    return NextResponse.json({ error: "Failed to load the audit log." }, { status: 500 });
  }
}
