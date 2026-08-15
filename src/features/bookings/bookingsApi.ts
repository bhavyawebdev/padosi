import { ApiError, toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { Booking, BookingStatus } from "@/types";

export async function fetchMyBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.rpc("my_bookings");
  if (error) throw toApiError(error);
  return (data ?? []) as Booking[];
}

export async function createBooking(providerId: string, message: string): Promise<Booking> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("booking_requests")
    .insert({ provider_id: providerId, customer_id: user.id, message })
    .select("id")
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(400, "You can't book your own service.");
  // Return the booking via the same shape used elsewhere (fetchMyBookings).
  const bookings = await fetchMyBookings();
  const created = bookings.find((b) => b.id === (data as { id: string }).id);
  if (created) return created;
  throw new ApiError(404, "Couldn't load the booking you just created.");
}

export async function respondBooking(
  bookingId: string,
  status: BookingStatus,
  reply?: string,
): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc("respond_booking", {
    p_booking_id: bookingId,
    p_status: status,
    p_reply: reply ?? null,
  });
  if (error) throw toApiError(error);
  return (data ?? { ok: true }) as { ok: boolean };
}
