"use client";

/**
 * src/features/messaging/use-typing.ts — typing indicator
 *
 * Uses BroadcastChannel so typing state is ephemeral (never persisted to the
 * data layer) and syncs across tabs of the same browser. When the app moves
 * to the production layer, this maps onto a Realtime presence/presence-state
 * channel (see src/lib/realtime/hooks.ts).
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface TypingEvent {
  conversationId: string;
  userId: string;
  name: string;
  at: number;
}

const CHANNEL_NAME = "aas-paas:typing";
const TYPING_EXPIRY_MS = 3000; // consider "typing" stale after 3s of silence

function createChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/**
 * Broadcast that `name` (user `userId`) is typing in `conversationId`.
 * Call on every keystroke — the hook throttles under the hood.
 */
export function useBroadcastTyping(conversationId: string | null | undefined, userId: string | null | undefined, name: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    channelRef.current = createChannel();
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  const broadcast = useCallback(() => {
    if (!conversationId || !userId) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1200) return; // throttle
    lastSentRef.current = now;
    const payload: TypingEvent = { conversationId, userId, name, at: now };
    channelRef.current?.postMessage(payload);
  }, [conversationId, userId, name]);

  return broadcast;
}

/**
 * Watch for typing events in `conversationId` (excluding the current user).
 * Returns the names of people currently typing, refreshed as events arrive.
 */
export function useTypingUsers(conversationId: string | null | undefined, currentUserId: string | null | undefined): string[] {
  const [typers, setTypers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!conversationId) return;
    const channel = createChannel();
    if (!channel) return;

    const timers: number[] = [];
    const userTimers = new Map<string, number>();

    const handleEvent = (event: MessageEvent<TypingEvent>) => {
      const data = event.data;
      if (!data || data.conversationId !== conversationId) return;
      if (data.userId === currentUserId) return;

      setTypers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data.name);
        return next;
      });

      // Replace this user's previous expiry timer so a stale timer can never
      // remove a still-typing user mid-keystroke.
      const previous = userTimers.get(data.userId);
      if (previous !== undefined) window.clearTimeout(previous);

      const timer = window.setTimeout(() => {
        userTimers.delete(data.userId);
        setTypers((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }, TYPING_EXPIRY_MS);
      userTimers.set(data.userId, timer);
      timers.push(timer);
    };

    channel.addEventListener("message", handleEvent);
    return () => {
      channel.removeEventListener("message", handleEvent);
      channel.close();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [conversationId, currentUserId]);

  return Array.from(typers.values()).slice(0, 2);
}
