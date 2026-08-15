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

export function HomeFeedPage() {
  const { user } = useAuth();
  const { point, usingFallback, request } = useGeolocation(user?.locality);
  const { view } = useViewLocality();
  const [category, setCategory] = useState<FeedCategory | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [radius, setRadius] = useState(2);
  const createPost = useCreatePost();

  useFeedSocket();

  useEffect(() => {
    request();
  }, [request]);

  const center = view ?? point;
  const feed = useFeed(
    {
      lat: center?.lat ?? 0,
      lng: center?.lng ?? 0,
      radiusKm: radius,
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
  const posts = feed.data ?? [];

  return (
    <div className="grid lg:grid-cols-[260px_1fr_320px] gap-8">
      {/* LEFT: filters sidebar */}
      <aside className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-full px-4 py-2.5 border border-outline-variant/40 w-fit">
          <span className="material-symbols-outlined text-lg text-primary">location_on</span> {areaName}
        </div>

        <LocalityContextRow />

        <div className="bg-white rounded-2xl border border-outline-variant/40 p-5">
          <p className="font-headline-lg font-bold mb-4">Category</p>
          <div className="space-y-1">
            <label className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input
                checked={category === "all"}
                onChange={() => setCategory("all")}
                className="rounded border-outline text-primary focus:ring-primary"
                type="checkbox"
              />
              <span className="text-sm">All updates</span>
            </label>
            {FEED_CATEGORIES.map((c) => (
              <label key={c.value} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <input
                  checked={category === c.value}
                  onChange={() => setCategory(c.value)}
                  className="rounded border-outline text-primary focus:ring-primary"
                  type="checkbox"
                />
                <span className="text-sm">{c.icon ? `${c.icon} ` : ""}{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant/40 p-5">
          <p className="font-headline-lg font-bold mb-4">Radius</p>
          <input
            className="w-full accent-primary"
            max="5"
            min="0.5"
            step="0.5"
            type="range"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
          />
          <p className="text-sm text-on-surface-variant mt-2">Within {radius} km</p>
        </div>
      </aside>

      {/* CENTER: feed */}
      <main>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-headline-lg font-bold text-2xl">Nearby Right Now</h1>
          <p className="text-sm text-on-surface-variant">{posts.length} update{posts.length !== 1 ? "s" : ""} active</p>
        </div>

        {/* Category chips (mobile) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 lg:hidden">
          <Chip label="All" active={category === "all"} onClick={() => setCategory("all")} />
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

        {usingFallback && point && !view && (
          <span className="inline-flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-high rounded-full px-3 py-1.5 mb-4">
            <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
            Showing posts around {areaName}
          </span>
        )}

        {!center ? (
          <LoadingState label="Locating you…" />
        ) : feed.isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : feed.isError ? (
          <ErrorState message={feed.error?.message ?? "Could not load the feed."} onRetry={() => feed.refetch()} />
        ) : posts.length === 0 ? (
          <EmptyState
            icon="radar"
            title="Quiet around here"
            message={`Nothing posted nearby yet. Be the first to share what's happening in ${view?.name ?? areaName}.`}
            action={
              <button onClick={() => setComposerOpen(true)} className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95">
                <span aria-hidden className="material-symbols-outlined text-[18px]">add</span>
                Share what's happening
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post, idx) => (
              <div key={post.id} className="animate-card-stagger" style={{ animationDelay: `${idx * 0.05}s` }}>
                <FeedPostCard post={post} />
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setComposerOpen(true)}
          aria-label="Create a post"
          className="fixed bottom-[88px] right-4 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 z-40"
        >
          <span aria-hidden className="material-symbols-outlined text-3xl">add</span>
        </button>

        <CreatePostModal
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSubmit={onSubmit}
          modes={["alert"]}
          areaName={areaName}
        />
      </main>

      {/* RIGHT: sidebar widgets */}
      <aside className="space-y-6">
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 p-5">
          <p className="font-headline-lg font-bold mb-4">Open requests near you</p>
          <div className="space-y-3">
            <Link to="/needs" className="block text-sm hover:text-primary transition-colors">
              <p className="font-semibold">Tall Ladder needed for 1 hour</p>
              <p className="text-on-surface-variant text-xs">350m away · Perry Cross Rd</p>
            </Link>
            <Link to="/needs" className="block text-sm hover:text-primary transition-colors">
              <p className="font-semibold">Anyone going to airport 5 AM?</p>
              <p className="text-on-surface-variant text-xs">3 min walk from you</p>
            </Link>
          </div>
          <Link to="/needs" className="text-sm font-semibold text-primary mt-4 inline-flex items-center gap-1">
            See Need It Now <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/40 p-5">
          <p className="font-headline-lg font-bold mb-4">Trusted this week</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container" />
              <div>
                <p className="text-sm font-semibold">Sita Bai <span className="text-primary text-xs">✓ Verified</span></p>
                <p className="text-xs text-on-surface-variant">Cook · 12 neighbors</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container" />
              <div>
                <p className="text-sm font-semibold">Lakshmi <span className="text-primary text-xs">✓ Verified</span></p>
                <p className="text-xs text-on-surface-variant">Maid · 24 neighbors</p>
              </div>
            </div>
          </div>
          <Link to="/help" className="text-sm font-semibold text-primary mt-4 inline-flex items-center gap-1">
            See Verified Help <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
