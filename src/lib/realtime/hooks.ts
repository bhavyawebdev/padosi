"use client";

/**
 * src/lib/realtime/hooks.ts — reusable Supabase Realtime hooks
 *
 * - Every hook is null-safe: when Supabase isn't configured, it no-ops.
 * - Subscriptions are created once per mount and cleaned up on unmount —
 *   never inside uncontrolled render loops.
 * - Events are de-duplicated by (id + event) so refetch + realtime don't
 *   double-apply.
 * - Presence uses the Realtime channel API (best-effort online status).
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type PostgresEvent = "INSERT" | "UPDATE" | "DELETE";
export type { RealtimePostgresChangesPayload };

type RowCallback = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

const lastEventKey = new WeakMap<object, string>();

/**
 * De-duplicate events by (eventType + id) per subscription. The key is a
 * stable object owned by the subscription (created in the effect), so inline
 * callbacks from callers never defeat the dedupe.
 */
function dedupe(key: object, payload: { id?: string | number; eventType?: string }): boolean {
  const eventKey = `${payload.eventType ?? ""}:${payload.id ?? ""}`;
  const previous = lastEventKey.get(key);
  if (previous === eventKey) return false;
  lastEventKey.set(key, eventKey);
  return true;
}

export type SubscriptionStatus = "idle" | "subscribed" | "error";

/**
 * Subscribe to Postgres changes on a table. Returns the live status.
 * `filter` examples: `user_id=eq.<id>`, `post_id=eq.<id>`.
 */
export function useRealtimeSubscription(options: {
  table: string;
  filter?: string;
  enabled?: boolean;
  onEvent: RowCallback;
}): { status: SubscriptionStatus } {
  const { table, filter, enabled = true, onEvent } = options;
  const [liveStatus, setLiveStatus] = useState<SubscriptionStatus>("idle");
  const callbackRef = useRef(onEvent);

  // Keep the latest callback without re-subscribing on every render.
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    if (!supabase) return;

    let active = true;
    const dedupeKey: object = {};
    const channel = supabase
      .channel(`pg-${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (active && dedupe(dedupeKey, payload)) callbackRef.current(payload);
        }
      )
      .subscribe((subStatus) => {
        if (!active) return;
        setLiveStatus(
          subStatus === "SUBSCRIBED" ? "subscribed" : subStatus === "CHANNEL_ERROR" ? "error" : "idle"
        );
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [table, filter, enabled]);

  // When the subscription is disabled (or Supabase isn't configured) the live
  // status is irrelevant — report "idle" without touching state mid-effect.
  const status: SubscriptionStatus = enabled ? liveStatus : "idle";

  return { status };
}

/** Live notifications for the current user. */
export function useRealtimeNotifications(userId: string | null | undefined, onEvent: RowCallback) {
  return useRealtimeSubscription({
    table: "notifications",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: Boolean(userId),
    onEvent,
  });
}

/** Live comments for a post (including thread replies). */
export function useRealtimeComments(postId: string | null | undefined, onEvent: RowCallback) {
  return useRealtimeSubscription({
    table: "post_comments",
    filter: postId ? `post_id=eq.${postId}` : undefined,
    enabled: Boolean(postId),
    onEvent,
  });
}

/** Live messages for a conversation. */
export function useRealtimeMessages(conversationId: string | null | undefined, onEvent: RowCallback) {
  return useRealtimeSubscription({
    table: "messages",
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    enabled: Boolean(conversationId),
    onEvent,
  });
}

/** Live membership/read-state changes for a conversation. */
export function useRealtimeConversation(
  conversationId: string | null | undefined,
  onEvent: RowCallback
) {
  return useRealtimeSubscription({
    table: "conversations",
    filter: conversationId ? `id=eq.${conversationId}` : undefined,
    enabled: Boolean(conversationId),
    onEvent,
  });
}

export type PresenceCallback = (presence: Record<string, unknown>) => void;

/**
 * Best-effort presence on a shared channel (e.g. `presence:<conversationId>`).
 * Publishes the given state for this client and reports other clients'
 * presence entries. Requires Supabase Realtime to be configured.
 */
export function useRealtimePresence(
  channelName: string | null | undefined,
  self: Record<string, unknown> | null,
  onPresence: PresenceCallback
) {
  const onPresenceRef = useRef(onPresence);
  const selfRef = useRef(self);

  useEffect(() => {
    onPresenceRef.current = onPresence;
  }, [onPresence]);

  // Serialize `self` so a fresh object identity each render (e.g. an inline
  // object literal) does not tear down and re-create the channel constantly.
  const selfKey = self ? JSON.stringify(self) : null;

  useEffect(() => {
    if (!channelName || !selfKey) return;
    const supabase = createClient();
    if (!supabase) return;

    selfRef.current = self;

    let active = true;
    const channel = supabase.channel(channelName);

    channel.on("presence", { event: "sync" }, () => {
      if (active) onPresenceRef.current(channel.presenceState());
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && selfRef.current) {
        await channel.track(selfRef.current);
      }
    });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [channelName, selfKey]);

  return;
}
