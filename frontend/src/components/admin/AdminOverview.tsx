import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/common/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { timeAgo } from "@/lib/geo";
import { useAdminModeration, useAdminOverview } from "@/features/admin/adminHooks";
import type { AdminOverviewCounts } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  traffic: "Traffic",
  civic: "Civic",
  safety: "Safety",
  utility: "Utility",
  event: "Event",
  other: "Other",
};

const STAT_CARDS: Array<{
  key: keyof AdminOverviewCounts;
  label: string;
  icon: string;
}> = [
  { key: "users", label: "Users", icon: "group" },
  { key: "businesses", label: "Businesses", icon: "storefront" },
  { key: "communities", label: "Communities", icon: "groups" },
  { key: "feed_posts", label: "Feed posts", icon: "campaign" },
  { key: "active_posts", label: "Active now", icon: "online_prediction" },
  { key: "open_requests", label: "Open requests", icon: "handshake" },
  { key: "providers", label: "Providers", icon: "verified_user" },
  { key: "verified_providers", label: "Verified", icon: "verified" },
  { key: "reviews", label: "Reviews", icon: "rate_review" },
  { key: "reports", label: "Reports", icon: "flag" },
];

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #e5e2dd",
  borderRadius: 12,
  fontFamily: "Manrope, sans-serif",
  fontSize: 13,
};

export function AdminOverview() {
  const { data, isLoading, isError, refetch } = useAdminOverview();
  const { dismissReport } = useAdminModeration();

  if (isLoading) return <LoadingState label="Crunching platform numbers…" />;
  if (isError || !data) {
    return <ErrorState message="Could not load the admin overview." onRetry={() => void refetch()} />;
  }

  const chartData = data.posts_by_category.map((c) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    count: c.count,
  }));
  const signupsData = data.signups_last_7_days.map((d) => ({
    name: d.date.slice(5),
    count: d.count,
  }));

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <section aria-label="Platform statistics">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAT_CARDS.map((card) => (
            <div
              key={card.key}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 shadow-sm"
            >
              <span
                aria-hidden
                className="material-symbols-outlined text-primary text-[22px]"
              >
                {card.icon}
              </span>
              <span className="text-headline-md font-headline-md text-on-background leading-none">
                {data.counts[card.key]}
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                {card.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5" aria-label="Charts">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <h3 className="text-label-md font-label-md text-on-background mb-4">
            Posts by category
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2dd" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#727971" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#727971" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f6f3ee" }} />
                <Bar dataKey="count" name="Posts" fill="#416448" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <h3 className="text-label-md font-label-md text-on-background mb-4">
            Signups — last 7 days
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupsData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2dd" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#727971" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#727971" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#c2c8bf" }} />
                <Line type="monotone" dataKey="count" name="Signups" stroke="#8b4e35" strokeWidth={2.5} dot={{ fill: "#8b4e35", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent reports */}
      <section aria-label="Recent reports">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-label-md font-label-md text-on-background">Recent reports</h3>
          <span className="text-label-sm font-label-sm text-on-surface-variant">
            {data.counts.reports} total
          </span>
        </div>
        {data.recent_reports.length === 0 ? (
          <EmptyState
            icon="verified_user"
            title="No reports yet"
            message="When neighbors flag something, it lands here for review."
          />
        ) : (
          <ul className="space-y-3">
            {data.recent_reports.map((report) => (
              <li
                key={report.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-label-md font-label-md text-on-background">{report.reporter_name}</span>
                    <span className="text-label-sm font-label-sm text-on-surface-variant">{timeAgo(report.created_at)}</span>
                    <span className="text-label-sm font-label-sm text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {report.target_type}
                    </span>
                  </div>
                  <p className="text-body-md font-body-md text-on-surface mt-1 line-clamp-2">{report.reason}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="close"
                  loading={dismissReport.isPending}
                  onClick={() => dismissReport.mutate(report.id)}
                >
                  Dismiss
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
