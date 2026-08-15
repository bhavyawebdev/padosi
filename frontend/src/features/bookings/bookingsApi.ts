import { api } from "@/lib/api";
import type { Booking, BookingStatus } from "@/types";

export async function fetchMyBookings(): Promise<Booking[]> {
  return api<Booking[]>("/directory/bookings");
}

export async function createBooking(providerId: string, message: string): Promise<Booking> {
  return api<Booking>(`/directory/${providerId}/bookings`, {
    method: "POST",
    body: { message },
  });
}

export async function respondBooking(
  bookingId: string,
  status: BookingStatus,
  reply?: string,
): Promise<Booking> {
  return api<Booking>(`/directory/bookings/${bookingId}/respond`, {
    method: "POST",
    body: { status, reply: reply ?? null },
  });
}
