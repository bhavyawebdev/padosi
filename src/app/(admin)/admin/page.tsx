"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  Clock,
  FileText,
  MessageSquare,
  UsersRound,
  Flag,
  Ban,
  ScrollText,
} from "lucide-react";

interface OverviewData {
  stats: {
    users: number;
    verifiedUsers: number;
    pendingVerification: number;
    posts: number;
    comments: number;
    groups: number;
    openReports: number;
    blockedUsers: number;
  };
  recentActivity: {
    id: string;
    action: string;
    actor_role: string | null;
    target_type: string | null;
    reason: string | null;
    created_at: string;
  }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/overview")
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to load dashboard");
        }
        return res.json() as Promise<OverviewData>;
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-error-container text-on-error-container label-md">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-surface-container animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const cards = [
    { label: "Total users", value: stats.users, icon: Users, tint: "bg-primary-container text-primary" },
    { label: "Verified users", value: stats.verifiedUsers, icon: ShieldCheck, tint: "bg-tertiary-container text-tertiary" },
    { label: "Pending verification", value: stats.pendingVerification, icon: Clock, tint: "bg-secondary-container text-secondary" },
    { label: "Posts", value: stats.posts, icon: FileText, tint: "bg-surface-container-high text-on-surface" },
    { label: "Comments", value: stats.comments, icon: MessageSquare, tint: "bg-surface-container-high text-on-surface" },
    { label: "Groups", value: stats.groups, icon: UsersRound, tint: "bg-surface-container-high text-on-surface" },
    { label: "Open reports", value: stats.openReports, icon: Flag, tint: "bg-error-container text-error" },
    { label: "Blocked pairs", value: stats.blockedUsers, icon: Ban, tint: "bg-surface-container-high text-on-surface" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="headline-lg text-on-surface font-extrabold tracking-tight">Dashboard</h1>
        <p className="body-md text-on-surface-variant">Community overview from live data.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-5 space-y-3"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.tint}`}>
              <card.icon size={20} />
            </div>
            <div>
              <p className="headline-md text-on-surface font-extrabold">{card.value.toLocaleString("en-IN")}</p>
              <p className="label-sm text-on-surface-variant">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6">
        <h2 className="headline-sm text-on-surface font-bold mb-4 flex items-center gap-2">
          <ScrollText size={18} className="text-on-surface-variant" />
          Recent moderation activity
        </h2>
        {data.recentActivity.length === 0 ? (
          <p className="body-md text-on-surface-variant">No moderation activity yet.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/20">
            {data.recentActivity.map((entry) => (
              <li key={entry.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="label-md text-on-surface font-semibold">{entry.action}</p>
                  {entry.reason && (
                    <p className="label-sm text-on-surface-variant">{entry.reason}</p>
                  )}
                </div>
                <time className="label-sm text-on-surface-variant shrink-0">
                  {new Date(entry.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
