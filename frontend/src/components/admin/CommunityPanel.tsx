import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { useCommunityOverview } from "@/features/admin/adminHooks";
import { PostsPanel } from "./AdminModerationPanels";

const CATEGORY_LABELS: Record<string, string> = {
  traffic: "Traffic",
  civic: "Civic",
  safety: "Safety",
  utility: "Utility",
  event: "Event",
  other: "Other",
};

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #e5e2dd",
  borderRadius: 12,
  fontFamily: "Manrope, sans-serif",
  fontSize: 13,
};

export function CommunityPanel() {
  const { data, isLoading, isError, refetch } = useCommunityOverview();

  if (isLoading) return <LoadingState label="Loading your society's pulse…" />;
  if (isError || !data) {
    return (
      <ErrorState
        message="Could not load your society dashboard."
        onRetry={() => void refetch()}
      />
    );
  }

  const stats = [
    { label: "Posts in area", value: data.post_count, icon: "campaign" },
    { label: "Active now", value: data.active_post_count, icon: "online_prediction" },
    { label: "Open requests", value: data.request_count, icon: "handshake" },
    { label: "Providers", value: data.provider_count, icon: "verified_user" },
  ];

  const chartData = data.posts_by_category.map((c) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    count: c.count,
  }));

  return (
    <div className="space-y-8">
      <section aria-label="Locality statistics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 shadow-sm"
            >
              <span aria-hidden className="material-symbols-outlined text-primary text-[22px]">
                {s.icon}
              </span>
              <span className="text-headline-md font-headline-md text-on-background leading-none">
                {s.value}
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
        <h3 className="text-label-md font-label-md text-on-background mb-4">
          What neighbors are posting — {data.locality_name}
        </h3>
        <div className="h-52">
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
      </section>

      <section aria-label="Area moderation">
        <h3 className="text-label-md font-label-md text-on-background mb-3">
          Recent posts in {data.locality_name}
        </h3>
        {data.recent_posts.length === 0 ? (
          <EmptyState
            icon="campaign"
            title="Nothing posted yet"
            message="When neighbors post in your area, you can resolve or remove them from here."
          />
        ) : (
          <PostsPanel posts={data.recent_posts} />
        )}
      </section>
    </div>
  );
}
