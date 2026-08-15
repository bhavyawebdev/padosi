import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, ErrorState, LoadingState, SkeletonCard } from "@/components/common/Feedback";
import { DistanceChip } from "@/components/common/DistanceChip";
import { categoryMeta } from "@/features/feed/feedConfig";
import { requestTypeMeta } from "@/features/requests/requestsConfig";
import { providerCategoryMeta } from "@/features/directory/directoryConfig";
import { useFeed } from "@/features/feed/feedHooks";
import { useRequests } from "@/features/requests/requestsHooks";
import { useProviders } from "@/features/directory/directoryHooks";
import { useViewLocality } from "@/features/locality/localityStore";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { timeAgo } from "@/lib/geo";
import { cn } from "@/lib/cn";

export function SearchPage() {
  const { user } = useAuth();
  const { point, request } = useGeolocation(user?.locality);
  const { view } = useViewLocality();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);

  useEffect(() => {
    request();
  }, [request]);

  // Search around the locality being browsed (defaults to your GPS area).
  const center = view ?? point;
  const enabled = center !== null && q.trim().length > 0;

  const feed = useFeed(
    { lat: center?.lat ?? 0, lng: center?.lng ?? 0, radiusKm: 5, q: q.trim() || undefined },
    enabled,
  );
  const requests = useRequests(
    { lat: center?.lat ?? 0, lng: center?.lng ?? 0, radiusKm: 5, q: q.trim() || undefined },
    enabled,
  );
  const providers = useProviders(
    { lat: center?.lat ?? 0, lng: center?.lng ?? 0, radiusKm: 10, q: q.trim() || undefined },
    enabled,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    setParams(trimmed ? { q: trimmed } : {});
  };

  const loading = enabled && (feed.isLoading || requests.isLoading || providers.isLoading);
  const hasError = enabled && (feed.isError || requests.isError || providers.isError);
  const total = (feed.data?.length ?? 0) + (requests.data?.length ?? 0) + (providers.data?.length ?? 0);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-background">
          Search nearby
        </h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          Find posts, requests, and trusted providers in your area.
        </p>
      </div>

      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search Padosi
        </label>
        <div className="relative flex-1">
          <span
            aria-hidden
            className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
          >
            search
          </span>
          <input
            id="search-q"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Traffic, plumber, spare ticket…"
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-11 pr-4 py-3 text-body-md font-body-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-on-primary px-5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95"
        >
          Search
        </button>
      </form>

      {!center ? (
        <LoadingState label="Locating you…" />
      ) : !q.trim() ? (
        <EmptyState
          icon="manage_search"
          title="Search your neighborhood"
          message="Try something specific — a street, a service, or a kind of request — and we'll search posts, requests, and the verified directory at once."
        />
      ) : loading ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : hasError ? (
        <ErrorState message="Could not complete the search. Please try again." onRetry={() => {
          feed.refetch();
          requests.refetch();
          providers.refetch();
        }} />
      ) : total === 0 ? (
        <EmptyState
          icon="search_off"
          title={`No results for "${q}"`}
          message="Nothing matched in posts, requests, or the directory. Try a broader term."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Alerts */}
          {feed.data && feed.data.length > 0 && (
            <SearchSection icon="radar" title="Nearby alerts" count={feed.data.length} tone="bg-secondary/15 text-secondary">
              {feed.data.map((post) => {
                const meta = categoryMeta(post.category);
                return (
                  <ResultRow
                    key={post.id}
                    to={`/posts/${post.id}`}
                    icon={meta.icon}
                    bubble={meta.bubble}
                    title={`${meta.label} · ${timeAgo(post.created_at)}`}
                    text={post.text}
                    distance={post.distance_m}
                  />
                );
              })}
            </SearchSection>
          )}

          {/* Requests */}
          {requests.data && requests.data.length > 0 && (
            <SearchSection icon="handshake" title="Requests" count={requests.data.length} tone="bg-tertiary-fixed/40 text-tertiary">
              {requests.data.map((req) => {
                const meta = requestTypeMeta(req.type);
                return (
                  <ResultRow
                    key={req.id}
                    to={`/requests/${req.id}`}
                    icon={meta.icon}
                    bubble="bg-tertiary-container/40 text-on-tertiary-container"
                    title={`${meta.label} · ${timeAgo(req.created_at)}`}
                    text={req.text}
                    distance={req.distance_m}
                  />
                );
              })}
            </SearchSection>
          )}

          {/* Providers */}
          {providers.data && providers.data.length > 0 && (
            <SearchSection icon="verified_user" title="Providers" count={providers.data.length} tone="bg-primary/15 text-primary">
              {providers.data.map((p) => {
                const meta = providerCategoryMeta(p.category);
                return (
                  <ResultRow
                    key={p.id}
                    to={`/providers/${p.id}`}
                    icon={meta.icon}
                    bubble="bg-primary-fixed-dim/40 text-on-primary-fixed-variant"
                    title={`${meta.label} · ${p.display_name}`}
                    text={p.tagline}
                    distance={p.distance_m}
                    verified={p.verified}
                  />
                );
              })}
            </SearchSection>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({
  icon,
  title,
  count,
  tone,
  children,
}: {
  icon: string;
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-label-md font-label-md text-on-background px-1">
        <span aria-hidden className={cn("material-symbols-outlined text-[18px] rounded-full p-1", tone)}>
          {icon}
        </span>
        {title}
        <span className="text-label-sm font-label-sm text-outline">({count})</span>
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function ResultRow({
  to,
  icon,
  bubble,
  title,
  text,
  distance,
  verified,
}: {
  to: string;
  icon: string;
  bubble: string;
  title: string;
  text: string;
  distance: number | null;
  verified?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <span className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bubble)}>
        <span aria-hidden className="material-symbols-outlined text-[20px]">
          {icon}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-label-md font-label-md text-on-background group-hover:text-primary transition-colors">
            {title}
          </span>
          {verified && (
            <span className="inline-flex items-center gap-0.5 text-label-sm font-label-sm text-primary">
              <span aria-hidden className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL'1" }}>
                verified
              </span>
              Verified
            </span>
          )}
        </span>
        <span className="block text-body-md font-body-md text-on-surface-variant truncate mt-0.5">{text}</span>
      </span>
      <DistanceChip distanceM={distance} className="shrink-0 mt-1" />
    </Link>
  );
}
