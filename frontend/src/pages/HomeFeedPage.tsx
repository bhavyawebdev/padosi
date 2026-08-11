import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Chip } from "@/components/common/Chip";
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from "@/components/common/Feedback";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { CreatePostModal, type ComposePayload } from "@/components/feed/CreatePostModal";
import { LocalityContextRow } from "@/components/layout/LocalityContextRow";
import { FEED_CATEGORIES } from "@/features/feed/feedConfig";
import { useCreatePost, useFeed } from "@/features/feed/feedHooks";
import { useViewLocality } from "@/features/locality/localityStore";
import { useFeedSocket } from "@/hooks/useFeedSocket";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/useAuth";
import type { FeedCategory } from "@/types";

const TABS = [
  { to: "/nearby", label: "Nearby" },
  { to: "/help", label: "Help" },
  { to: "/needs", label: "Needs" },
];

export function HomeFeedPage() {
  const { user } = useAuth();
  const { point, usingFallback, request } = useGeolocation(user?.locality);
  const { view } = useViewLocality();
  const [category, setCategory] = useState<FeedCategory | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const createPost = useCreatePost();

  useFeedSocket();

  useEffect(() => {
    request();
  }, [request]);

  // When the user picks a locality to browse, that area's center drives the
  // radius query instead of the GPS point ("my area" stays GPS-driven).
  const center = view ?? point;
  const feed = useFeed(
    {
      lat: center?.lat ?? 0,
      lng: center?.lng ?? 0,
      radiusKm: 3,
      category: category === "all" ? null : category,
    },
    center !== null,
  );

  const onSubmit = async (payload: ComposePayload) => {
    if (!point) return;
    if (payload.kind === "feed") {
      await createPost.mutateAsync({
        category: payload.category,
        text: payload.text,
        lat: point.lat,
        lng: point.lng,
        urgent: payload.urgent,
      });
    }
  };

  const areaName = user?.locality?.name ?? "your area";

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* Module tabs (screen 01) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-margin-mobile px-margin-mobile">
        {TABS.map((tab) =>
          tab.to === "/nearby" ? (
            <button
              key={tab.to}
              className="bg-primary-container text-on-primary-container rounded-full px-4 py-2 text-label-md font-label-md whitespace-nowrap transition-transform duration-150 active:scale-95 shadow-sm"
            >
              {tab.label}
            </button>
          ) : (
            <Link
              key={tab.to}
              to={tab.to}
              className="bg-surface-container-low text-on-surface-variant border border-outline-variant rounded-full px-4 py-2 text-label-md font-label-md whitespace-nowrap hover:bg-surface-variant transition-colors"
            >
              {tab.label}
            </Link>
          ),
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-margin-mobile px-margin-mobile">
        <Chip
          label="All"
          active={category === "all"}
          onClick={() => setCategory("all")}
        />
        {FEED_CATEGORIES.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            icon={c.icon}
            active={category === c.value}
            onClick={() => setCategory(c.value === category ? "all" : c.value)}
          />
        ))}
      </div>

      {/* Locality context row — browsing chip + mobile switcher */}
      <LocalityContextRow />
      {usingFallback && point && !view && (
        <span className="inline-flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-high rounded-full px-3 py-1.5 self-start">
          <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">
            pin_drop
          </span>
          Showing posts around {areaName}
        </span>
      )}

      {/* Feed list */}
      {!center ? (
        <LoadingState label="Locating you…" />
      ) : feed.isLoading ? (
        <div className="flex flex-col gap-8 mt-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : feed.isError ? (
        <ErrorState message={feed.error?.message ?? "Could not load the feed."} onRetry={() => feed.refetch()} />
      ) : (() => {
        const posts = feed.data ?? [];
        if (posts.length === 0) {
          return (
            <EmptyState
              icon="radar"
              title="Quiet around here"
              message={`Nothing posted nearby yet. Be the first to share what's happening in ${view?.name ?? areaName}.`}
              action={
                <button onClick={() => setComposerOpen(true)} className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95">
                  <span aria-hidden className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  Share what's happening
                </button>
              }
            />
          );
        }
        return (
          <div className="flex flex-col gap-8 mt-2">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        );
      })()}

      {/* FAB (screen 01) */}
      <button
        onClick={() => setComposerOpen(true)}
        aria-label="Create a post"
        className="fixed bottom-[88px] right-margin-mobile w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 z-40"
      >
        <span aria-hidden className="material-symbols-outlined text-3xl">
          add
        </span>
      </button>

      <CreatePostModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={onSubmit}
        modes={["alert"]}
        areaName={areaName}
      />
    </div>
  );
}
