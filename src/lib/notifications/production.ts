import "server-only";

/**
 * src/lib/notifications/production.ts — production notification helpers
 * (SERVER ONLY)
 *
 * Notifications are written through the service-role client (or the
 * SECURITY DEFINER `create_notification` RPC) so trusted server-side flows
 * (triggers, admin actions, message fan-out) can notify any recipient.
 * The browser user can only read/update their own rows via RLS.
 */

import { getAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/domain";

export type ProductionNotificationType =
  | NotificationType
  | "system"
  | "moderation";

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: ProductionNotificationType;
  title?: string;
  content: string;
  entityType?: string;
  entityId?: string;
  relatedLink?: string;
}

/**
 * Insert a notification row for a recipient. Uses the service-role client and
 * returns false (with a server-side log) when the table isn't available yet.
 */
export async function createProductionNotification(
  input: CreateNotificationInput
): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) {
    console.error("Aas-Paas: notification write skipped — service role client unavailable.");
    return false;
  }

  const { error } = await admin.from("notifications").insert({
    user_id: input.recipientId,
    actor_id: input.actorId ?? null,
    type: input.type,
    title: input.title ?? null,
    content: input.content,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    related_link: input.relatedLink ?? null,
  });

  if (error) {
    // "relation does not exist" → migration not applied; never crash callers.
    console.error("Aas-Paas: notification write failed", error.message);
    return false;
  }
  return true;
}
