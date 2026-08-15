import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { VerifiedByChip, VerifiedMark } from "@/components/common/Chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { ReportButton } from "@/components/common/ReportButton";
import { BookingModal } from "@/components/directory/BookingModal";
import { ReviewModal } from "@/components/directory/ReviewModal";
import { Stars } from "@/components/directory/Stars";
import { useCreateBooking } from "@/features/bookings/bookingsHooks";
import { reportProvider } from "@/features/directory/directoryApi";
import { providerCategoryMeta } from "@/features/directory/directoryConfig";
import { useCreateReview, useProvider } from "@/features/directory/directoryHooks";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/geo";

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const provider = useProvider(id);
  const createReview = useCreateReview(id);
  const createBooking = useCreateBooking();

  if (provider.isLoading) return <LoadingState label="Loading provider…" />;
  if (provider.isError || !provider.data) {
    return <ErrorState message={provider.error?.message ?? "Provider not found."} onRetry={() => provider.refetch()} />;
  }

  const p = provider.data;
  const cat = providerCategoryMeta(p.category);
  const isOwner = user?.id === p.user_id;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-label-md font-label-md text-primary hover:underline"
      >
        <span aria-hidden className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        Back to directory
      </Link>

      {/* Identity card */}
      <section className="bg-surface-container rounded-xl p-5 border border-[#E5E0D8] shadow-sm space-y-5">
        <div className="flex gap-5 flex-wrap">
          <Avatar name={p.display_name} size="xl" className="border border-outline-variant shadow-sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-headline-lg font-headline-lg text-on-background">{p.display_name}</h1>
              {p.verified && <VerifiedMark />}
              <Stars rating={p.avg_rating} />
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1">
              {cat.label} • {p.tagline}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.verified ? (
                <VerifiedByChip count={p.verification_count} />
              ) : (
                <span className="inline-flex items-center text-label-sm font-label-sm text-on-surface-variant bg-surface-variant px-2 py-1 rounded-md">
                  {p.review_count} {p.review_count === 1 ? "review" : "reviews"} — verified after 3 neighbor reviews
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <ReportButton submitReport={(reason) => reportProvider(p.id, reason)} />
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E5E0D8]">
          <div className="bg-surface rounded-xl p-5">
            <dt className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Price range</dt>
            <dd className="text-body-md font-body-md text-on-surface mt-1">{p.price_range ?? "Not shared"}</dd>
          </div>
          <div className="bg-surface rounded-xl p-5">
            <dt className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Availability</dt>
            <dd className="text-body-md font-body-md text-on-surface mt-1">{p.availability ?? "Not shared"}</dd>
          </div>
          <div className="bg-surface rounded-xl p-5">
            <dt className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Service area</dt>
            <dd className="text-body-md font-body-md text-on-surface mt-1">{p.service_area_km} km</dd>
          </div>
        </dl>

        {!isOwner && (
          <>
            {bookingSent ? (
              <div className="flex items-center gap-3 bg-primary-fixed-dim/30 border border-primary/30 rounded-xl px-4 py-3">
                <span aria-hidden className="material-symbols-outlined text-primary">
                  check_circle
                </span>
                <p className="text-body-md font-body-md text-on-surface">
                  Request sent! {p.display_name} will see it in their bookings and get back to you.
                </p>
              </div>
            ) : (
              <button
                onClick={() => setBookingOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95"
              >
                <span aria-hidden className="material-symbols-outlined text-[20px]">
                  handshake
                </span>
                Request service
              </button>
            )}
            <button
              onClick={() => setReviewOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-surface-container-high border border-outline text-on-surface py-3 rounded-full text-label-md font-label-md hover:bg-surface-variant transition-colors active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                rate_review
              </span>
              Write a review
            </button>
          </>
        )}
        {isOwner && (
          <p className="text-label-sm font-label-sm text-on-surface-variant text-center">
            This is your profile — neighbours can request your service and leave reviews here.
          </p>
        )}
      </section>

      {/* Reviews */}
      <section className="space-y-5">
        <h2 className="text-headline-md font-headline-md text-on-background border-b border-outline-variant pb-2">
          Responses ({p.reviews.length})
        </h2>
        {p.reviews.length === 0 ? (
          <EmptyState icon="rate_review" title="No reviews yet" message="Be the first neighbor to vouch for this provider." />
        ) : (
          <div className="space-y-3">
            {p.reviews.map((r) => (
              <article key={r.id} className="flex gap-3">
                <Avatar name={r.reviewer_name} size="sm" />
                <div className="bg-surface-container rounded-2xl rounded-tl-none p-3 flex-1 shadow-sm border border-surface-variant">
                  <div className="flex justify-between items-start mb-base">
                    <h4 className="text-label-md font-label-md text-on-background">{r.reviewer_name}</h4>
                    <span className="text-label-sm font-label-sm text-on-surface-variant">{timeAgo(r.created_at)}</span>
                  </div>
                  <Stars rating={r.rating} className="mb-1" />
                  <p className="text-body-md font-body-md text-on-surface">{r.text}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmit={(rating, text) => createReview.mutateAsync({ rating, text })}
      />

      <BookingModal
        open={bookingOpen}
        providerName={p.display_name}
        submitting={createBooking.isPending}
        error={bookingError}
        onClose={() => {
          setBookingOpen(false);
          setBookingError(null);
        }}
        onSubmit={(message) =>
          createBooking
            .mutateAsync({ providerId: p.id, message })
            .then(() => {
              setBookingOpen(false);
              setBookingSent(true);
              setBookingError(null);
            })
            .catch((err: unknown) => {
              setBookingError(err instanceof Error ? err.message : "Couldn't send the request.");
            })
        }
      />
    </div>
  );
}
