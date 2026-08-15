import { useQuery } from "@tanstack/react-query";

import { toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { NotificationItem } from "@/types";

const READ_KEY = "lp_notif_read_at";

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase.rpc("my_notifications");
  if (error) throw toApiError(error);
  return (data ?? []) as NotificationItem[];
}

export function getLastRead(): string {
  return localStorage.getItem(READ_KEY) ?? "";
}

export function markAllRead(nowIso: string = new Date().toISOString()): void {
  localStorage.setItem(READ_KEY, nowIso);
}

export function countUnread(items: NotificationItem[], lastRead: string): number {
  if (!lastRead) return items.length;
  const cutoff = new Date(lastRead).getTime();
  return items.filter((n) => new Date(n.created_at).getTime() > cutoff).length;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
