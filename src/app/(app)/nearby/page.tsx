import type { Metadata } from "next";
import { NearbyFeed } from "@/features/nearby/components/NearbyFeed";
import { MapPin, Radio } from "lucide-react";

export const metadata: Metadata = {
  title: "Nearby Right Now",
  description: "See live real-time updates from your neighbourhood right now.",
};

export default function NearbyPage() {
  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant label-sm font-bold">
              <Radio size={14} className="animate-pulse text-primary" /> Live Updates
            </span>
          </div>
          <h1 className="headline-lg text-primary font-extrabold tracking-tight">
            Nearby Right Now
          </h1>
          <p className="body-md text-on-surface-variant mt-1">
            Real-time updates, local events, and happenings around your block.
          </p>
        </div>

        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary-container/20 text-primary items-center justify-center">
          <MapPin size={28} />
        </div>
      </header>

      <section aria-label="Nearby Feed">
        <NearbyFeed filter="nearby" />
      </section>
    </div>
  );
}
