import { useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/common/Feedback";
import { useMyBookings, useRespondBooking } from "@/features/bookings/bookingsHooks";
import { providerCategoryMeta } from "@/features/directory/directoryConfig";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/geo";
import type { Booking } from "@/types";

const STATUS_STYLE: Record<Booking["status"], { label: string; className: string }> = {
  new: { label: "New request", className: "bg-secondary-fixed/50 text-on-secondary-container" },
  accepted: { label: "Accepted", className: "bg-primary-fixed-dim/50 text-on-primary-fixed-variant" },
  declined: { label: "Declined", className: "bg-surface-variant text-on-surface-variant" },
};

export function BookingsSection() {
  const { user } = useAuth();
  const bookings = useMyBookings();
  const respond = useRespondBooking();

  if (bookings.isLoading) return null;
  if (bookings.isError || !bookings.data || bookings.data.length === 0) return null;

  const incoming = bookings.data.filter((b) => b.direction === "incoming");
  const outgoing = bookings.data.filter((b) => b.direction === "outgoing");

  return (
    <section className="space-y-5">
      <h2 className="text-headline-md font-headline-md text-on-background px-2">
        Service bookings
        {incoming.filter((b) => b.status === "new").length > 0 && (
          <span className="ml-2 align-middle text-label-sm font-label-sm text-on-secondary-container bg-secondary-fixed/60 rounded-full px-2.5 py-1">
            {incoming.filter((b) => b.status === "new").length} waiting
          </span>
        )}
      </h2>

      {incoming.length === 0 && outgoing.length === 0 && (
        <div className="bg-surface-container rounded-xl border border-surface-variant">
          <EmptyState
            icon="handshake"
            title="No bookings yet"
            message="When a neighbour requests your service (or you request theirs), it shows up here."
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {incoming.map((b) => (
          <BookingCard key={b.id} booking={b} respond={respond.mutateAsync} isProvider meId={user?.id} />
        ))}
        {outgoing.map((b) => (
          <BookingCard key={b.id} booking={b} respond={undefined} isProvider={false} meId={user?.id} />
        ))}
      </div>
    </section>
  );
}

function BookingCard({
  booking,
  respond,
  isProvider,
  meId,
}: {
  booking: Booking;
  respond?: (args: { bookingId: string; status: "accepted" | "declined"; reply?: string }) => Promise<unknown>;
  isProvider: boolean;
  meId?: string;
}) {
  const [note, setNote] = useState("");
  const cat = providerCategoryMeta(booking.provider_category);
  const status = STATUS_STYLE[booking.status];
  const otherName = isProvider ? booking.customer_name : booking.provider_name;
  const otherId = isProvider ? booking.customer_id : booking.provider_id;
  const canChat = meId !== otherId;

  const doRespond = (status: "accepted" | "declined") => {
    if (!respond) return;
    void respond({ bookingId: booking.id, status, reply: note.trim() || undefined });
  };

  return (
    <article className="bg-surface-container rounded-xl p-5 border border-surface-variant shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-md font-label-md text-on-background">
            {isProvider ? (
              <>
                {otherName} <span className="text-on-surface-variant">asked for</span>{" "}
                <span className="text-primary font-bold">{cat.label}</span>
              </>
            ) : (
              <>
                You asked <span className="text-primary font-bold">{cat.label}</span> from {otherName}
              </>
            )}
          </p>
          <p className="text-label-sm font-label-sm text-on-surface-variant mt-0.5">
            {timeAgo(booking.created_at)} · {booking.provider_name}
          </p>
        </div>
        <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-label-sm font-label-sm", status.className)}>
          {status.label}
        </span>
      </div>

      <p className="text-body-md font-body-md text-on-surface bg-surface-container-low rounded-xl p-3.5 border border-outline-variant/30">
        “{booking.message}”
      </p>

      {booking.reply && (
        <p className="text-body-md font-body-md text-on-surface-variant flex items-start gap-2">
          <span aria-hidden className="material-symbols-outlined text-[18px] text-primary">
            reply
          </span>
          {booking.reply}
        </p>
      )}

      {isProvider && booking.status === "new" && respond && (
        <div className="space-y-2.5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="Add a note for the neighbour (optional)"
            className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-2.5 font-body-md text-body-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
          />
          <div className="flex gap-2">
            <button
              onClick={() => doRespond("accepted")}
              disabled={respond === undefined}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              Accept
            </button>
            <button
              onClick={() => doRespond("declined")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-surface-container-high border border-outline text-on-surface py-2.5 rounded-full text-label-md font-label-md hover:bg-surface-variant transition-colors active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                cancel
              </span>
              Decline
            </button>
          </div>
          <p className="text-label-sm font-label-sm text-on-surface-variant">
            Accepting opens a private chat so you can coordinate.
          </p>
        </div>
      )}

      {booking.status === "accepted" && canChat && (
        <Link
          to={`/messages?user=${otherId}`}
          className="inline-flex items-center gap-1.5 text-label-md font-label-md text-primary hover:underline"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            chat_bubble
          </span>
          Message {otherName.split(" ")[0]}
        </Link>
      )}
    </article>
  );
}
