import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Subscribes to the live feed WebSocket. On a `feed.post_created` event the
 * feed query is invalidated so the authoritative rows are refetched
 * (distance is viewer-specific, so we never trust pushed payloads).
 * Reconnects with exponential backoff while the page is open.
 */
export function useFeedSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws/feed`);
      wsRef.current = ws;

      ws.onopen = () => {
        retry = 0;
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as { type?: string };
          if (message.type === "feed.post_created") {
            queryClient.invalidateQueries({ queryKey: ["feed"] });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (!closed) {
          retry = Math.min(retry + 1, 5);
          timer = setTimeout(connect, 1000 * 2 ** retry);
        }
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [queryClient]);

  return wsRef;
}
