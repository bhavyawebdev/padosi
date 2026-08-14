"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  AtSign,
  Users,
  MessageSquare,
  Heart,
  ShieldCheck,
  Shield,
  Bell,
  MapPin,
  HeartHandshake,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/local-db";
import { timeAgo } from "@/lib/utils/format";
import type { NotificationWithActor } from "@/lib/db/types";
import { notificationTitle } from "../index";

const TYPE_STYLES: Record<string, { icon: React.ComponentType<{ size?: number | string; className?: string }>; className: string }> = {
  message: { icon: MessageCircle, className: "bg-primary-fixed/40 text-primary" },
  mention: { icon: AtSign, className: "bg-secondary-fixed/40 text-secondary" },
  group_invite: { icon: Users, className: "bg-tertiary-fixed/40 text-tertiary" },
  group: { icon: Users, className: "bg-tertiary-fixed/40 text-tertiary" },
  reply: { icon: MessageSquare, className: "bg-primary-fixed/40 text-primary" },
  comment: { icon: MessageSquare, className: "bg-primary-fixed/40 text-primary" },
  reaction: { icon: Heart, className: "bg-secondary-fixed/40 text-secondary" },
  trust_update: { icon: ShieldCheck, className: "bg-secondary-fixed/40 text-secondary" },
  moderation: { icon: Shield, className: "bg-error-container/60 text-on-error-container" },
  post_nearby: { icon: MapPin, className: "bg-primary-fixed/40 text-primary" },
  post_help: { icon: HeartHandshake, className: "bg-secondary-fixed/40 text-secondary" },
  post_need: { icon: AlertCircle, className: "bg-tertiary-fixed/40 text-tertiary" },
  system: { icon: Bell, className: "bg-surface-container text-on-surface-variant" },
};

interface NotificationListProps {
  items: NotificationWithActor[];
  loading?: boolean;
}

export function NotificationList({ items, loading }: NotificationListProps) {
  const router = useRouter();

  const handleOpen = async (n: NotificationWithActor) => {
    if (!n.is_read) await db.markNotificationRead(n.id);
    if (n.related_link) router.push(n.related_link);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 soft-card-shadow flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell size={28} />}
        title="No notifications yet"
        description="When neighbours reply to you, mention you in a group, or send you a message, it will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((n) => {
        const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.system;
        const Icon = style.icon;
        return (
          <Card
            key={n.id}
            hoverable
            onClick={() => handleOpen(n)}
            className={`p-5 flex items-start gap-4 cursor-pointer ${
              n.is_read ? "" : "border-primary-fixed"
            }`}
          >
            {n.actor_id && n.actor ? (
              <Avatar
                src={n.actor.avatar_url}
                fallback={n.actor.full_name}
                alt={n.actor.full_name}
                size="lg"
                className="shrink-0"
              />
            ) : (
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${style.className}`}
              >
                <Icon size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={`label-md truncate ${
                    n.is_read ? "font-bold text-on-surface" : "font-extrabold text-on-surface"
                  }`}
                >
                  {notificationTitle(n)}
                </h4>
                <span className="label-sm text-on-surface-variant/70 shrink-0">
                  {timeAgo(n.created_at)}
                </span>
              </div>
              <p className="body-md text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                {n.content}
              </p>
            </div>
            {!n.is_read && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-primary mt-2 shrink-0"
                aria-label="Unread"
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
