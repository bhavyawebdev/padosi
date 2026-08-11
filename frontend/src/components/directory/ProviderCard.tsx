import { Link } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { DistanceChip } from "@/components/common/DistanceChip";
import { ReportButton } from "@/components/common/ReportButton";
import { SaveButton } from "@/components/common/SaveButton";
import { VerifiedByChip } from "@/components/common/Chip";
import { reportProvider } from "@/features/directory/directoryApi";
import { providerCategoryMeta } from "@/features/directory/directoryConfig";
import type { ProviderProfile } from "@/types";
import { Stars } from "./Stars";

export function ProviderCard({ provider }: { provider: ProviderProfile }) {
  const cat = providerCategoryMeta(provider.category);

  return (
    <div className="bg-surface-container rounded-xl p-5 border border-[#E5E0D8] shadow-sm flex flex-col gap-3">
      <div className="flex gap-3">
        <Avatar name={provider.display_name} size="lg" className="border border-outline-variant shadow-sm" />
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-headline-md font-headline-md text-on-background truncate">{provider.display_name}</h3>
            <div className="flex items-center gap-1">
              <Stars rating={provider.avg_rating} />
              <SaveButton kind="provider" id={provider.id} className="px-2 py-1" />
            </div>
          </div>
          <p className="text-body-md font-body-md text-on-surface-variant truncate">
            {cat.label} • {provider.tagline}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {provider.verified ? (
              <VerifiedByChip count={provider.verification_count} />
            ) : (
              <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant bg-surface-variant px-2 py-1 rounded-md">
                {provider.review_count} {provider.review_count === 1 ? "review" : "reviews"} — gaining trust
              </span>
            )}
            <DistanceChip distanceM={provider.distance_m} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-[#E5E0D8]">
        <Link
          to={`/providers/${provider.id}`}
          className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-label-md font-label-md flex justify-center items-center gap-2 transition-colors active:bg-primary-container active:text-on-primary-container"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            person_search
          </span>
          View profile
        </Link>
        <ReportButton submitReport={(reason) => reportProvider(provider.id, reason)} />
      </div>
    </div>
  );
}
