import type { Metadata } from "next";
import { HelpFeed } from "@/features/help/components/HelpFeed";
import { ShieldCheck, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "Verified Help",
  description: "Find trusted helpers and skilled neighbours near you.",
};

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container label-sm font-bold border border-secondary-container/70">
              <ShieldCheck size={14} className="text-secondary" /> Community Verified
            </span>
          </div>
          <h1 className="headline-lg text-secondary font-extrabold tracking-tight">
            Verified Help
          </h1>
          <p className="body-md text-on-surface-variant mt-1">
            Trusted helpers, skilled neighbours, and community support in your locality.
          </p>
        </div>

        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-secondary-container/30 text-secondary items-center justify-center">
          <HeartHandshake size={28} />
        </div>
      </header>

      <section aria-label="Help Feed">
        <HelpFeed />
      </section>
    </div>
  );
}
