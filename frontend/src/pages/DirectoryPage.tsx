import { useEffect, useState } from "react";

import { Chip } from "@/components/common/Chip";
import { SearchInput } from "@/components/common/Form";
import { LocalityContextRow } from "@/components/layout/LocalityContextRow";
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from "@/components/common/Feedback";
import { ProviderCard } from "@/components/directory/ProviderCard";
import { ProviderFormModal } from "@/components/directory/ProviderFormModal";
import { PROVIDER_CATEGORIES } from "@/features/directory/directoryConfig";
import { useProviders } from "@/features/directory/directoryHooks";
import { useViewLocality } from "@/features/locality/localityStore";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { ProviderCategory } from "@/types";

export function DirectoryPage() {
  const { user } = useAuth();
  const { point, request } = useGeolocation(user?.locality);
  const { view } = useViewLocality();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ProviderCategory | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    request();
  }, [request]);

  // Browsing another locality? Query around it instead of the GPS point.
  const center = view ?? point;
  const providers = useProviders(
    {
      lat: center?.lat ?? 0,
      lng: center?.lng ?? 0,
      category: category === "all" ? null : category,
      verifiedOnly,
      q: q.trim() || undefined,
    },
    center !== null,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header row */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-background">
            Verified Help
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Trusted by neighbors, not ads.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            add_business
          </span>
          List your service
        </button>
      </div>

      {/* Locality context row — browsing chip + mobile switcher */}
      <LocalityContextRow />

      {/* Search */}
      <SearchInput placeholder="Search cook, maid, tutor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search providers" />

      {/* Category chips (screen 02) */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-margin-mobile px-margin-mobile">
        <Chip label="All" active={category === "all"} onClick={() => setCategory("all")} icon="apps" />
        {PROVIDER_CATEGORIES.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            icon={c.icon}
            active={category === c.value}
            onClick={() => setCategory(c.value === category ? "all" : c.value)}
          />
        ))}
        <Chip
          label="Verified only"
          icon="verified_user"
          active={verifiedOnly}
          onClick={() => setVerifiedOnly((v) => !v)}
          tone="primary"
          activeClassName="bg-primary-fixed-dim/40 text-on-primary-fixed-variant border border-primary"
        />
      </div>

      {/* Provider list */}
      {!center ? (
        <LoadingState label="Locating you…" />
      ) : providers.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : providers.isError ? (
        <ErrorState message={providers.error?.message ?? "Could not load the directory."} onRetry={() => providers.refetch()} />
      ) : providers.data && providers.data.length === 0 ? (
        <EmptyState
          icon="verified_user"
          title="No providers found"
          message="Try widening your search, or be the first verified neighbor to offer this service."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(providers.data ?? []).map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}

      <ProviderFormModal open={formOpen} onClose={() => setFormOpen(false)} location={point} />
    </div>
  );
}
