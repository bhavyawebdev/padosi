"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/db/local-db";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import { useNotifications } from "@/features/notifications";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { items, loading } = useNotifications();

  // Opening the page clears the unread badges (and the nav badge) —
  // the notification list keeps its per-item styling from the first fetch.
  useEffect(() => {
    if (user) void db.markAllNotificationsRead(user.id);
  }, [user]);

  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between">
        <div>
          <h1 className="headline-lg text-primary font-extrabold tracking-tight">
            Notifications
          </h1>
          <p className="body-md text-on-surface-variant mt-1">
            Stay updated when neighbours reply to you, mention you, or send you a message.
          </p>
        </div>
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary-fixed/40 text-primary items-center justify-center">
          <Bell size={28} />
        </div>
      </header>

      <section aria-label="Notifications">
        <NotificationList items={items} loading={loading} />
      </section>
    </div>
  );
}
