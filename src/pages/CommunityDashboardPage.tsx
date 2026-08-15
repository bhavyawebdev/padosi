import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { useCommunityOverview } from "@/features/admin/adminHooks";
import { categoryLabel } from "@/features/feed/feedConfig";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/geo";
import type { FeedCategory } from "@/types";

/**
 * Community (RWA / society) dashboard — the landing page for community
 * accounts. Data comes from the protected `community_overview` RPC, which
 * the database restricts to the account's own locality; platform-admin pages
 * (/admin/*) are not part of this experience.
 */
export function CommunityDashboardPage() {
  const { user } = useAuth();
  const overview = useCommunityOverview();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-headline-lg font-headline-lg text-on-background">Community dashboard</h1>
        <p className="text-body-md font-body-md text-on-surface-variant mt-1">
          {user?.full_name} · official notices and the pulse of your society.
        </p>
      </header>

      {overview.isLoading ? (
        <LoadingState label="Loading your society's pulse…" />
      ) : overview.isError || !overview.data ? (
        <ErrorState
          message={
            overview.error instanceof Error && overview.error.message
              ? overview.error.message
              : "Couldn't load your society dashboard."
          }
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <>
          <div className="bg-primary text-on-primary rounded-2xl p-6 shadow-sm">
            <p className="text-label-sm font-label-sm text-on-primary/80 uppercase tracking-wider">Your society</p>
            <p className="text-headline-md font-headline-md mt-1">{overview.data.locality_name}</p>
          </div>

          <section aria-label="Locality statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Posts in area", value: overview.data.post_count, icon: "campaign" },
              { label: "Active now", value: overview.data.active_post_count, icon: "online_prediction" },
              { label: "Open requests", value: overview.data.request_count, icon: "handshake" },
              { label: "Providers", value: overview.data.provider_count, icon: "verified_user" },
            ].map((s) => (
              <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <span aria-hidden className="material-symbols-outlined text-primary text-[22px]">
                  {s.icon}
                </span>
                <span className="text-headline-md font-headline-md text-on-background leading-none">{s.value}</span>
                <span className="text-label-sm font-label-sm text-on-surface-variant">{s.label}</span>
              </div>
            ))}
          </section>

          <section aria-label="What neighbours are posting" className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h2 className="text-headline-md font-headline-md text-on-background mb-4">
              What neighbours are posting
            </h2>
            {overview.data.posts_by_category.length === 0 ? (
              <p className="text-body-md font-body-md text-on-surface-variant">No posts in your area yet.</p>
            ) : (
              <ul className="space-y-3">
                {overview.data.posts_by_category.map((c) => {
                  const max = Math.max(...overview.data.posts_by_category.map((x) => x.count), 1);
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-label-sm font-label-sm text-on-surface-variant">
                        {categoryLabel(c.category as FeedCategory) ?? c.category}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(8, (c.count / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-label-sm font-label-sm text-on-background">{c.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Recent posts">
            <h2 className="text-headline-md font-headline-md text-on-background mb-4">Recent posts in your area</h2>
            {overview.data.recent_posts.length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <EmptyState
                  icon="campaign"
                  title="Nothing posted yet"
                  message="When neighbours post in your area, they'll show up here."
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {overview.data.recent_posts.map((post) => (
                  <li key={post.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-label-sm font-label-sm text-on-surface-variant">
                        {post.author_name} · {categoryLabel(post.category as FeedCategory)} · {timeAgo(post.created_at)}
                      </p>
                      <div className="flex shrink-0 gap-1.5">
                        {post.urgent && (
                          <span className="text-label-sm font-label-sm text-on-error bg-error-container/60 rounded-full px-2.5 py-0.5">Urgent</span>
                        )}
                        {post.resolved && (
                          <span className="text-label-sm font-label-sm text-on-surface-variant bg-surface-container-high rounded-full px-2.5 py-0.5">Resolved</span>
                        )}
                        <span className={cn("text-label-sm font-label-sm rounded-full px-2.5 py-0.5", post.confirm_count > 0 ? "bg-primary/10 text-primary" : "text-on-surface-variant bg-surface-container-high")}>
                          {post.confirm_count} confirm{post.confirm_count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <p className="text-body-md font-body-md text-on-background">{post.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Quick actions" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { to: "/nearby", label: "Post a society notice", icon: "campaign" },
              { to: "/needs", label: "Browse requests", icon: "handshake" },
              { to: "/help", label: "Verified Help", icon: "verified_user" },
              { to: "/profile", label: "Society profile", icon: "person" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
              >
                <span aria-hidden className="material-symbols-outlined text-primary">{l.icon}</span>
                <span className="text-label-md font-label-md text-on-background">{l.label}</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
