import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/common/Feedback";
import {
  countUnread,
  getLastRead,
  markAllRead,
  useNotifications,
} from "@/features/notifications/notificationsApi";
import { timeAgo } from "@/lib/geo";
import { cn } from "@/lib/cn";
import type { NotificationItem } from "@/types";

function targetPath(n: NotificationItem): string {
  if (n.target_type === "request") return `/requests/${n.target_id}`;
  if (n.target_type === "provider") return `/providers/${n.target_id}`;
  if (n.target_type === "post") return `/posts/${n.target_id}`;
  return "/nearby";
}

const ICON: Record<NotificationItem["type"], string> = {
  reply: "forum",
  confirm: "thumb_up",
  review: "rate_review",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState<string>(() => getLastRead());
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useNotifications();
  const items = data ?? [];
  const unread = countUnread(items, lastRead);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n: NotificationItem) => {
    setOpen(false);
    navigate(targetPath(n));
  };

  const hasRead = useMemo(() => lastRead !== "", [lastRead]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
      >
        <span aria-hidden className="material-symbols-outlined">
          notifications
        </span>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 z-50 w-[min(92vw,360px)] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-paper-lg overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/60">
            <h3 className="text-label-md font-label-md text-on-background">Notifications</h3>
            <button
              onClick={() => {
                markAllRead();
                setLastRead(getLastRead());
              }}
              disabled={unread === 0}
              className="text-label-sm font-label-sm text-primary hover:underline disabled:opacity-40"
            >
              Mark all read
            </button>
          </header>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <EmptyState
                icon="notifications_off"
                title="All caught up"
                message="Replies, confirms, and reviews will show up here."
              />
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {items.slice(0, 20).map((n) => {
                  const isUnread = !hasRead || new Date(n.created_at).getTime() > new Date(lastRead).getTime();
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => openItem(n)}
                        className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
                      >
                        <span
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            isUnread ? "bg-primary/15 text-primary" : "bg-surface-variant text-on-surface-variant",
                          )}
                        >
                          <span aria-hidden className="material-symbols-outlined text-[16px]">
                            {ICON[n.type]}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-label-md font-label-md text-on-background truncate">
                              {n.title}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-error shrink-0" aria-label="Unread" />
                            )}
                          </span>
                          <span className="block text-label-sm font-label-sm text-on-surface-variant truncate">
                            {n.detail}
                          </span>
                          <span className="block text-label-sm font-label-sm text-outline mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
