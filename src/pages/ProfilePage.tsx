import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
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

  const badges: Array<{ label: string; icon: string }> = [];
  if (user.phone_verified) badges.push({ label: "Verified Resident", icon: "verified" });
  if (isEarlyAdopter) badges.push({ label: "Early Adopter", icon: "sprout" });
  if (isHelper) badges.push({ label: "Helper", icon: "volunteer_activism" });
  if (user.role === "community") badges.push({ label: "Society Voice", icon: "groups" });
  if (user.role === "business" && user.govt_id_verified) badges.push({ label: "Verified Business", icon: "storefront" });
  if (badges.length === 0) badges.push({ label: "Neighbor", icon: "handshake" });

  const stats = [
    { label: "Helps Given", value: activity.data?.replies_count ?? 0 },
    { label: "Recommendations", value: activity.data?.reviews_count ?? 0 },
  ];

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-8">
      {/* LEFT: profile sidebar */}
      <aside className="space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 text-center animate-card-enter hover-lift">
          <Avatar name={user.full_name} size="xl" className="mx-auto mb-4 border-4 border-surface-container-low" />
          <h1 className="font-headline-lg font-bold text-xl">{user.full_name}</h1>
          <p className="text-sm text-on-surface-variant flex items-center justify-center gap-1 mt-1">
            <span className="material-symbols-outlined text-base">location_on</span> {user.locality?.name ?? "No locality"}
          </p>
          {user.phone_verified && (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mt-3">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL'1" }}>verified</span> Verified Resident
            </span>
          )}
          <button
            onClick={() => setEditOpen(true)}
            className="w-full mt-5 border border-outline-variant text-sm font-semibold py-2.5 rounded-full hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">edit</span> Edit Profile
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-outline-variant/40 p-5 text-center">
              <p className="text-3xl font-headline-lg font-bold">{s.value}</p>
              <p className="text-xs text-on-surface-variant mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 animate-card-stagger" style={{ animationDelay: "0.1s" }}>
          <p className="font-headline-lg font-bold mb-4">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.label} className="bg-surface-container-low text-xs font-semibold px-3 py-1.5 rounded-full border border-outline-variant/40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">{b.icon}</span> {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 animate-card-stagger" style={{ animationDelay: "0.2s" }}>
          <p className="font-headline-lg font-bold mb-3">About</p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {user.about || "No bio yet — tell neighbors a little about yourself."}
          </p>
        </div>

        {/* Saved items */}
        <Link
          to="/saved"
          className="bg-white rounded-2xl border border-outline-variant/40 p-5 flex items-center gap-3 hover:bg-surface-container-low transition-colors group"
        >
          <span className="w-10 h-10 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined">bookmark</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-label-md font-label-md text-on-background">Saved items</span>
            <span className="block text-label-sm font-label-sm text-on-surface-variant truncate">
              Bookmarked posts, requests & providers
            </span>
          </span>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
            chevron_right
          </span>
        </Link>
      </aside>

      {/* RIGHT: activity */}
      <main>
        <h2 className="font-headline-lg font-bold text-xl mb-6">Recent Activity</h2>
        {activity.isLoading ? (
          <LoadingState label="Loading activity…" />
        ) : activity.data && activity.data.items.length === 0 ? (
          <EmptyState icon="history" title="No activity yet" message="Your posts, requests, and reviews will show up here." />
        ) : (
          <div className="space-y-4">
            {(activity.data?.items ?? []).map((item, idx) => {
              const visual = activityVisual(item);
              return (
                <div key={idx} className="bg-white rounded-2xl border border-outline-variant/40 p-6 flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${visual.bubble}`}>
                    <span aria-hidden className="material-symbols-outlined text-[20px]">{visual.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{activityLabel(item)}</p>
                      <p className="text-xs text-on-surface-variant">{timeAgo(item.created_at)}</p>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bookings */}
        <div className="mt-8">
          <BookingsSection />
        </div>

        {/* Security */}
        <section aria-labelledby="security-heading" className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span aria-hidden className="material-symbols-outlined text-primary text-[22px]">security</span>
            <h3 id="security-heading" className="font-headline-lg font-bold">Security & privacy</h3>
          </div>
          <SecuritySection />
        </section>

        {/* Sign out */}
        <div className="flex justify-center pb-3 mt-8">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 text-label-md font-label-md text-error bg-error-container/40 hover:bg-error-container rounded-full px-5 py-2.5 transition-colors active:scale-95"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">logout</span>
            Sign out
          </button>
        </div>
      </main>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
