import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookingStatus } from "@/types";

import { createBooking, fetchMyBookings, respondBooking } from "./bookingsApi";

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: fetchMyBookings,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, message }: { providerId: string; message: string }) =>
      createBooking(providerId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRespondBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status, reply }: { bookingId: string; status: BookingStatus; reply?: string }) =>
      respondBooking(bookingId, status, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      // Accepting a booking may have opened a conversation — refresh the inbox too.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
