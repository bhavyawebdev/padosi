import type { Metadata } from "next";
import { NeedFeed } from "@/features/need/components/NeedFeed";
import { AlertCircle, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Need It Now",
  description: "Urgent community requests from your neighbourhood.",
};

export default function NeedPage() {
  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed/60 text-on-tertiary-fixed-variant label-sm font-bold border border-tertiary-fixed">
              <Clock size={14} className="text-tertiary" /> Time Sensitive
            </span>
          </div>
          <h1 className="headline-lg text-tertiary font-extrabold tracking-tight">
            Need It Now
          </h1>
          <p className="body-md text-on-surface-variant mt-1">
            Urgent requests for borrowing items, quick favours, and emergency support.
          </p>
        </div>

        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-tertiary-fixed/30 text-tertiary items-center justify-center">
          <AlertCircle size={28} />
        </div>
      </header>

      <section aria-label="Need Feed">
        <NeedFeed />
      </section>
    </div>
  );
}
