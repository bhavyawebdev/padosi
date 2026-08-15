import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { ProviderFormModal } from "@/components/directory/ProviderFormModal";
import { useMyBookings } from "@/features/bookings/bookingsHooks";
import { providerCategoryMeta } from "@/features/directory/directoryConfig";
import { useMyProviderProfile } from "@/features/directory/directoryHooks";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { timeAgo } from "@/lib/geo";

/**
 * Business dashboard — the landing page for business/provider accounts.
 *
 * Everything comes from the existing API layer (provider profiles + the
 * bookings RPC), not from hardcoded data. The customer feed/directory remain
 * available through the normal header nav.
 */
export function BusinessDashboardPage() {
  const { user } = useAuth();
  const profile = useMyProviderProfile();
  const bookings = useMyBookings();
  const { point, request } = useGeolocation(user?.locality);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    request();
  }, [request]);

  const incoming = (bookings.data ?? []).filter((b) => b.direction === "incoming");
  const waiting = incoming.filter((b) => b.status === "new").length;
  const recent = [...(bookings.data ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-headline-lg font-headline-lg text-on-background">Business dashboard</h1>
        <p className="text-body-md font-body-md text-on-surface-variant mt-1">
          {user?.full_name} · grow your local reputation, respond to neighbours, and manage your listing.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider profile status */}
        <section aria-labelledby="listing-heading" className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h2 id="listing-heading" className="text-headline-md font-headline-md text-on-background mb-4 flex items-center gap-2">
            <span aria-hidden className="material-symbols-outlined text-primary text-[22px]">storefront</span>
            Your listing
          </h2>

          {profile.isLoading ? (
            <LoadingState label="Loading your listing…" />
          ) : profile.isError ? (
            <ErrorState message="Couldn't load your listing." onRetry={() => void profile.refetch()} />
          ) : profile.data ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                    {providerCategoryMeta(profile.data.category).label}
                  </p>
                  <p className="text-body-lg font-body-lg text-on-background mt-1">{profile.data.tagline}</p>
                </div>
                {profile.data.verified ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-label-sm font-label-sm text-on-primary bg-primary px-3 py-1.5 rounded-full">
                    <span aria-hidden className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL'1" }}>
                      verified
                    </span>
                    Verified by {profile.data.verification_count}
                  </span>
                ) : (
                  <span className="shrink-0 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-high px-3 py-1.5 rounded-full">
                    Awaiting {Math.max(0, 3 - profile.data.verification_count)} more review
                  </span>
                )}
              </div>
              {(profile.data.price_range || profile.data.availability) && (
                <div className="flex flex-wrap gap-2 text-label-sm font-label-sm text-on-surface-variant">
                  {profile.data.price_range && (
                    <span className="bg-surface-container rounded-full px-3 py-1">{profile.data.price_range}</span>
                  )}
                  {profile.data.availability && (
                    <span className="bg-surface-container rounded-full px-3 py-1">{profile.data.availability}</span>
                  )}
                </div>
              )}
              <Link
                to={`/providers/${profile.data.id}`}
                className="inline-flex items-center gap-1.5 text-label-md font-label-md text-primary hover:underline"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px]">visibility</span>
                View how neighbours see you
              </Link>
            </div>
          ) : (
            <EmptyState
              icon="storefront"
              title="You haven't listed a service yet"
              message="Add a profile so neighbours can find, review and book you — cooks, tutors, plumbers and more."
              action={
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
                >
                  <span aria-hidden className="material-symbols-outlined text-[18px]">add</span>
                  List your service
                </button>
              }
            />
          )}
        </section>

        {/* Bookings summary */}
        <section aria-labelledby="bookings-heading" className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h2 id="bookings-heading" className="text-headline-md font-headline-md text-on-background mb-4 flex items-center gap-2">
            <span aria-hidden className="material-symbols-outlined text-primary text-[22px]">handshake</span>
            Bookings
            {waiting > 0 && (
              <span className="ml-1 text-label-sm font-label-sm text-on-secondary-container bg-secondary-fixed/60 rounded-full px-2.5 py-1">
                {waiting} waiting
              </span>
            )}
          </h2>

          {bookings.isLoading ? (
            <LoadingState label="Loading bookings…" />
          ) : bookings.isError ? (
            <ErrorState message="Couldn't load your bookings." onRetry={() => void bookings.refetch()} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon="handshake"
              title="No bookings yet"
              message="When a neighbour requests your service, it appears here for you to accept or decline."
            />
          ) : (
            <ul className="space-y-3">
              {recent.map((b) => (
                <li key={b.id} className="bg-surface-container rounded-xl p-4 border border-surface-variant space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-label-md font-label-md text-on-background truncate">
                      {b.direction === "incoming" ? b.customer_name : b.provider_name}
                    </p>
                    <span className="shrink-0 text-label-sm font-label-sm text-on-surface-variant">{timeAgo(b.created_at)}</span>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant line-clamp-2">“{b.message}”</p>
                </li>
              ))}
            </ul>
          )}

          <Link to="/profile" className="mt-4 inline-flex items-center gap-1.5 text-label-md font-label-md text-primary hover:underline">
            <span aria-hidden className="material-symbols-outlined text-[18px]">chevron_right</span>
            Open the full bookings inbox
          </Link>
        </section>
      </div>

      {/* Quick links */}
      <section aria-label="Quick links" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: "/help", label: "Verified Help directory", icon: "verified_user" },
          { to: "/nearby", label: "Nearby feed", icon: "explore" },
          { to: "/needs", label: "Need It Now", icon: "bolt" },
          { to: "/messages", label: "Messages", icon: "chat_bubble" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-primary">{l.icon}</span>
            <span className="text-label-md font-label-md text-on-background">{l.label}</span>
          </Link>
        ))}
      </section>

      <ProviderFormModal open={formOpen} onClose={() => setFormOpen(false)} location={point} />
    </div>
  );
}
