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
    <div>
      {/* Header */}
      <h1 className="font-headline-lg font-bold text-3xl mb-2">Verified Help</h1>
      <p className="text-on-surface-variant mb-8">Trusted recommendations from neighbors in {user?.locality?.name ?? "your area"}.</p>

      {/* Search + verified toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Search cook, maid, tutor, plumber..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search providers"
          />
        </div>
        <label className="flex items-center gap-2 bg-white border border-outline-variant/60 rounded-full px-4 py-3 text-sm font-medium cursor-pointer">
          <input
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="rounded text-primary focus:ring-primary"
            type="checkbox"
          />
          Verified only
        </label>
      </div>

      {/* Locality context */}
      <LocalityContextRow />

      {/* Category chips */}
      <div className="flex flex-wrap gap-2.5 mb-10 mt-4">
        <Chip
          label="All"
          active={category === "all"}
          onClick={() => setCategory("all")}
          icon="apps"
        />
        {PROVIDER_CATEGORIES.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            icon={c.icon}
            active={category === c.value}
            onClick={() => setCategory(c.value === category ? "all" : c.value)}
          />
        ))}
      </div>

      {/* Provider grid */}
      {!center ? (
        <LoadingState label="Locating you…" />
      ) : providers.isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(providers.data ?? []).map((provider, idx) => (
            <div key={provider.id} className="animate-card-stagger hover-lift" style={{ animationDelay: `${idx * 0.05}s` }}>
              <ProviderCard provider={provider} />
            </div>
          ))}
        </div>
      )}

      <ProviderFormModal open={formOpen} onClose={() => setFormOpen(false)} location={point} />
    </div>
  );
}
