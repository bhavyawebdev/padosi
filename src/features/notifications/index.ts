"use client";

/**
 * src/features/notifications/index.ts — notifications feature domain
 *
 * Notifications are stored in the LocalDatabase layer and delivered in real
 * time through the local-db-changed event + cross-tab storage sync.
 */

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/db/local-db";
import { useDbSync } from "@/lib/db/use-db-sync";
import type { NotificationWithActor } from "@/lib/db/types";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications";
import type { NotificationType } from "@/types/domain";

/** Human-readable heading for a notification, based on its type + actor. */
export function notificationTitle(n: NotificationWithActor): string {
  const actorName = n.actor?.full_name;
  switch (n.type) {
    case "message":
      return actorName ? `New message from ${actorName}` : "New message";
    case "mention":
      return actorName ? `${actorName} mentioned you` : "You were mentioned";
    case "group_invite":
      return actorName ? `${actorName} added you to a group` : "Added to a group";
    case "reply":
      return actorName ? `${actorName} replied to your post` : "New reply";
    case "comment":
      return actorName ? `${actorName} commented on your post` : "New comment";
    case "reaction":
      return actorName ? `${actorName} reacted to your post` : "New reaction";
    default:
      return NOTIFICATION_TEMPLATES[n.type as NotificationType]?.en ?? "Notification";
  }
}

/** The current user's notifications, newest first. */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);

  useDbSync(
    useCallback(async () => {
      if (!user) return;
      const data = await db.getNotifications(user.id);
      setItems(data);
      setLoading(false);
    }, [user]),
    [user?.id]
  );

  return { items, loading };
}
