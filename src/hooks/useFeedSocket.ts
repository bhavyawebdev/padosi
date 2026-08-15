import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";

/**
 * Subscribes to live feed posts over Supabase Realtime (replaces the old
 * WebSocket). On a `feed_posts` INSERT the feed query is invalidated so the
 * authoritative rows are refetched (distance is viewer-specific, so pushed
 * payloads are never trusted). The subscription is removed on unmount.
 */
export function useFeedSocket() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("feed-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feed_posts" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["feed"] });
        },
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [queryClient]);

  return channelRef;
}
