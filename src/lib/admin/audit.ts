import "server-only";

/**
 * src/lib/admin/audit.ts — immutable audit log helper (SERVER ONLY)
 *
 * Audit rows are written exclusively through the service-role client:
 * RLS on audit_logs has no INSERT/UPDATE/DELETE policies for normal users,
 * so the only writers are trusted server-side flows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "user.suspend"
  | "user.unsuspend"
  | "user.disable"
  | "user.restore"
  | "user.change_role"
  | "user.warn"
  | "report.dismiss"
  | "report.resolve"
  | "content.remove"
  | "content.restore"
  | "cleanup_unverified_accounts"
  | "system.config_change";

export interface AuditEntry {
  actorId: string | null;
  actorRole: string;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append an audit entry. `admin` defaults to the cached service-role client;
 * callers may pass their own instance. Failures are logged server-side and
 * swallowed — an audit write must never break the primary action, but the
 * error is always surfaced to server logs.
 */
export async function logAudit(
  entry: AuditEntry,
  admin: SupabaseClient | null = null
): Promise<boolean> {
  const client = admin ?? getAdminClient();
  if (!client) {
    console.error("Aas-Paas: audit log write skipped — service role client unavailable.");
    return false;
  }

  const { error } = await client.from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    reason: entry.reason ?? null,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    console.error("Aas-Paas: audit log write failed", error.message);
    return false;
  }
  return true;
}
