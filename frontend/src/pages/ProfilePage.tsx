import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { VerifiedMark } from "@/components/common/Chip";
import { EmptyState, LoadingState } from "@/components/common/Feedback";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { BookingsSection } from "@/components/profile/BookingsSection";
import { SecuritySection } from "@/components/profile/SecuritySection";
import { categoryMeta, FEED_CATEGORIES } from "@/features/feed/feedConfig";
import { requestTypeMeta, REQUEST_TYPES } from "@/features/requests/requestsConfig";
import { useMyActivity } from "@/features/users/activityHooks";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/geo";
import type { ActivityItem } from "@/features/users/activityApi";
import type { FeedCategory, RequestType } from "@/types";

function feedCategoryFromTitle(title: string): FeedCategory {
  return FEED_CATEGORIES.some((c) => c.value === title) ? (title as FeedCategory) : "other";
}

function requestTypeFromTitle(title: string): RequestType {
  return REQUEST_TYPES.some((t) => t.value === title) ? (title as RequestType) : "other";
}

function activityVisual(item: ActivityItem): { icon: string; bubble: string } {
  switch (item.type) {
    case "post":
      return { icon: categoryMeta(feedCategoryFromTitle(item.title)).icon, bubble: "bg-primary/10 text-primary" };
    case "request":
      return { icon: requestTypeMeta(requestTypeFromTitle(item.title)).icon, bubble: "bg-secondary-fixed/40 text-on-secondary-container" };
    case "review":
      return { icon: "rate_review", bubble: "bg-primary-fixed/40 text-primary" };
    case "reply":
      return { icon: "forum", bubble: "bg-tertiary-container/20 text-tertiary" };
  }
}

function activityLabel(item: ActivityItem): string {
  switch (item.type) {
    case "post":
      return `${categoryMeta(feedCategoryFromTitle(item.title)).label} post`;
    case "request":
      return requestTypeMeta(requestTypeFromTitle(item.title)).label;
    case "review":
      return item.title;
    case "reply":
      return "Helped a neighbor";
  }
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const activity = useMyActivity();

  if (!user) return null;

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isEarlyAdopter = Date.now() - new Date(user.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
  const isHelper = (activity.data?.reviews_count ?? 0) > 0 || (activity.data?.replies_count ?? 0) > 0;

  const badges: Array<{ label: string; icon: string; tone: string }> = [];
  if (user.phone_verified) badges.push({ label: "Verified Resident", icon: "verified", tone: "text-primary" });
  if (isEarlyAdopter) badges.push({ label: "Early Adopter", icon: "sprout", tone: "text-secondary" });
  if (isHelper) badges.push({ label: "Helper", icon: "volunteer_activism", tone: "text-primary" });
  if (user.role === "community") badges.push({ label: "Society Voice", icon: "groups", tone: "text-tertiary" });
  if (user.role === "business" && user.govt_id_verified) badges.push({ label: "Verified Business", icon: "storefront", tone: "text-primary" });
  if (badges.length === 0) badges.push({ label: "Neighbor", icon: "handshake", tone: "text-tertiary" });

  const stats = [
    { label: "Posts shared", value: activity.data?.posts_count ?? "–", icon: "campaign" },
    { label: "Requests", value: activity.data?.requests_count ?? "–", icon: "handshake" },
    { label: "Reviews written", value: activity.data?.reviews_count ?? "–", icon: "rate_review" },
    { label: "Replies sent", value: activity.data?.replies_count ?? "–", icon: "forum" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Identity card (screen 05) */}
        <div className="md:col-span-8 bg-surface-container rounded-xl p-8 border border-surface-variant flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed-dim/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <Avatar name={user.full_name} size="xl" className="border-4 border-background shrink-0 relative z-10 shadow-sm" />
          <div className="flex-1 relative z-10 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-headline-xl font-headline-xl text-on-background truncate">{user.full_name}</h2>
              {user.phone_verified && <VerifiedMark />}
            </div>
            <p className="text-body-lg font-body-lg text-on-surface-variant mb-4 flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined text-outline">
                pin_drop
              </span>
              {user.locality?.name ?? "No locality set"}
            </p>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
              <span aria-hidden className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL'1" }}>
                verified
              </span>
              <span className="text-label-sm font-label-sm font-bold">Verified Resident</span>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 z-10 md:static">
            <button
              onClick={() => setEditOpen(true)}
              className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-full hover:bg-surface-tint transition-colors shadow-sm flex items-center gap-2 active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                edit
              </span>
              Edit
            </button>
          </div>
        </div>

        {/* Stats (screen 05: 2-up) */}
        <div className="md:col-span-4 grid grid-cols-2 gap-gutter">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface-container rounded-xl p-5 border border-surface-variant shadow-sm">
              <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">{s.label}</p>
              <div className="flex items-center justify-between">
                <p className="text-headline-lg font-headline-lg text-on-background">{s.value}</p>
                <span className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary">
                  <span aria-hidden className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL'1" }}>
                    {s.icon}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* Left: badges + about */}
        <div className="md:col-span-1 flex flex-col gap-gutter">
          <div className="bg-surface-container rounded-xl p-5 border border-surface-variant">
            <h3 className="text-headline-md font-headline-md text-on-background mb-4">Badges</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b.label} className="flex items-center gap-2 bg-surface-variant/50 px-3 py-2 rounded-lg border border-outline-variant/30">
                  <span aria-hidden className={`material-symbols-outlined text-[20px] ${b.tone}`}>
                    {b.icon}
                  </span>
                  <span className="text-label-sm font-label-sm text-on-surface">{b.label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="bg-surface-container rounded-xl p-5 border border-surface-variant">
            <h3 className="text-headline-md font-headline-md text-on-background mb-3">About</h3>
            <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              {user.about || "No bio yet — tell neighbors a little about yourself."}
            </p>
          </div>
          <Link
            to="/saved"
            className="flex items-center gap-3 bg-surface-container rounded-xl p-5 border border-surface-variant hover:bg-surface-container-high transition-colors group"
          >
            <span className="w-10 h-10 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-secondary shrink-0">
              <span aria-hidden className="material-symbols-outlined">
                bookmark
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-label-md font-label-md text-on-background">Saved items</span>
              <span className="block text-label-sm font-label-sm text-on-surface-variant truncate">
                Bookmarked posts, requests & providers
              </span>
            </span>
            <span aria-hidden className="material-symbols-outlined ml-auto text-on-surface-variant group-hover:text-primary transition-colors">
              chevron_right
            </span>
          </Link>
        </div>

        {/* Right: recent activity */}
        <div className="md:col-span-2 flex flex-col gap-gutter">
          <h3 className="text-headline-md font-headline-md text-on-background px-2">Recent Activity</h3>
          {activity.isLoading ? (
            <LoadingState label="Loading activity…" />
          ) : activity.data && activity.data.items.length === 0 ? (
            <EmptyState icon="history" title="No activity yet" message="Your posts, requests, and reviews will show up here." />
          ) : (
            (activity.data?.items ?? []).map((item, idx) => {
              const visual = activityVisual(item);
              return (
                <div
                  key={idx}
                  className="bg-surface-container rounded-xl p-5 border border-surface-variant shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-transform hover:-translate-y-1 duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${visual.bubble}`}>
                      <span aria-hidden className="material-symbols-outlined text-[20px]">
                        {visual.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h4 className="text-label-md font-label-md text-on-background">{activityLabel(item)}</h4>
                        <span className="text-label-sm font-label-sm text-outline shrink-0">{timeAgo(item.created_at)}</span>
                      </div>
                      <p className="text-body-md font-body-md text-on-surface-variant mb-3 line-clamp-2">{item.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Service bookings (incoming + outgoing) */}
      <BookingsSection />

      {/* Security & privacy — password, sessions, sign-out controls */}
      <section aria-labelledby="security-heading">
        <div className="flex items-center gap-2 px-2 mb-4">
          <span aria-hidden className="material-symbols-outlined text-primary text-[22px]">
            security
          </span>
          <h3 id="security-heading" className="text-headline-md font-headline-md text-on-background">
            Security & privacy
          </h3>
        </div>
        <SecuritySection />
      </section>

      {/* Sign out — available on mobile too (header button is desktop-only) */}
      <div className="flex justify-center pb-3">
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 text-label-md font-label-md text-error bg-error-container/40 hover:bg-error-container rounded-full px-5 py-2.5 transition-colors active:scale-95"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            logout
          </span>
          Sign out
        </button>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
