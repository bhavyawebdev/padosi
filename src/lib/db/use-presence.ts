"use client";

/**
 * src/lib/db/use-presence.ts — local presence heartbeat
 *
 * Bumps the user's last_seen_at on mount and every few minutes while the app
 * is open, so "online / last seen" indicators stay truthful across tabs.
 * Uses the same local-db-changed event as everything else; cross-tab presence
 * works through the storage sync in useDbSync.
 */

import { useEffect } from "react";
import { db } from "./local-db";

const HEARTBEAT_MS = 2 * 60 * 1000; // every 2 minutes

export function usePresence(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;

    const beat = () => {
      void db.touchLastSeen(userId);
    };

    // Deferred so the first write never runs synchronously in the effect.
    void Promise.resolve().then(beat);
    const interval = setInterval(beat, HEARTBEAT_MS);

    // Also beat right before the tab closes/hides.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      beat(); // final heartbeat on unmount
    };
  }, [userId]);
}
