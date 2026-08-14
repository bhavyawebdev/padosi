import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, HeartHandshake, AlertCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Post",
  description: "Share something with your neighbourhood.",
};

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <header className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow">
        <h1 className="headline-lg text-primary font-extrabold tracking-tight">
          Create a Post
        </h1>
        <p className="body-md text-on-surface-variant mt-1">
          Select what type of update, offer, or request you want to share with your neighbourhood.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/create/nearby"
          className="flex flex-col justify-between p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow hover-lift group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
              <MapPin size={24} />
            </div>
            <h3 className="headline-md font-bold text-on-surface mb-2">Nearby Right Now</h3>
            <p className="body-md text-on-surface-variant">
              Share local news, events, garden updates, or neighborhood announcements.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 label-md font-bold text-primary">
            <span>Continue</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        <Link
          href="/create/help"
          className="flex flex-col justify-between p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow hover-lift group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
              <HeartHandshake size={24} />
            </div>
            <h3 className="headline-md font-bold text-on-surface mb-2">Verified Help</h3>
            <p className="body-md text-on-surface-variant">
              List your skills, offer local services, or post availability to assist neighbours.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 label-md font-bold text-secondary">
            <span>Continue</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        <Link
          href="/create/need"
          className="flex flex-col justify-between p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow hover-lift group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
              <AlertCircle size={24} />
            </div>
            <h3 className="headline-md font-bold text-on-surface mb-2">Need It Now</h3>
            <p className="body-md text-on-surface-variant">
              Ask neighbours for urgent help, borrowing tools, or immediate assistance.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1 label-md font-bold text-tertiary">
            <span>Continue</span>
            <ArrowRight size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
}
