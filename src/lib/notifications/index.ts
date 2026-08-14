/**
 * src/lib/notifications/index.ts — In-App Notifications
 *
 * Notifications are stored in the app's local data layer (LocalDatabase) and
 * delivered in real time through the local-db-changed event + cross-tab
 * storage sync — the same mechanism every Aas-Paas feed uses.
 *
 * The Supabase `notifications` table (see migrations) mirrors this shape so
 * the layer can move server-side without a rewrite.
 */

import type { NotificationType } from "@/types/domain";
import { db } from "@/lib/db/local-db";

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: string | null;
  relatedLink?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Notification message templates.
 * Supports both English and Hindi.
 */
export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  { en: string; hi: string }
> = {
  post_nearby:  { en: "Someone shared something nearby",       hi: "पास में कुछ हुआ" },
  post_help:    { en: "A new help offer near you",             hi: "पास में सहायता उपलब्ध है" },
  post_need:    { en: "Someone needs help nearby",             hi: "पास में किसी को मदद चाहिए" },
  reply:        { en: "Someone replied to your post",          hi: "आपके पोस्ट पर जवाब आया" },
  comment:      { en: "New comment on your post",              hi: "आपके पोस्ट पर टिप्पणी आई" },
  reaction:     { en: "Someone reacted to your post",          hi: "किसी ने आपके पोस्ट पर प्रतिक्रिया दी" },
  message:      { en: "New message",                           hi: "नया संदेश" },
  mention:      { en: "You were mentioned",                    hi: "आपका उल्लेख हुआ" },
  group_invite: { en: "Added to a group",                      hi: "ग्रुप में जोड़ा गया" },
  group:        { en: "Group update",                          hi: "ग्रुप अपडेट" },
  trust_update: { en: "Your trust score was updated",          hi: "आपका भरोसा स्कोर बदला" },
  moderation:   { en: "Your post was reviewed",                hi: "आपका पोस्ट समीक्षित हुआ" },
  system:       { en: "System notification",                   hi: "सिस्टम सूचना" },
};

/**
 * Create a notification record in the local data layer.
 * Real-time delivery happens automatically via the local-db-changed event.
 */
export async function createNotification(
  payload: CreateNotificationPayload
): Promise<void> {
  await db.createNotification({
    user_id: payload.userId,
    actor_id: payload.actorId ?? null,
    type: payload.type,
    content: payload.body || payload.title,
    related_link: payload.relatedLink ?? null,
  });
}
