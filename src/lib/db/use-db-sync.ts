"use client";

import { useEffect } from "react";
import { STORAGE_KEY } from "./local-db";

/**
 * useDbSync — subscribes a fetcher to the app's real-time data events.
 *
 * The Aas-Paas data layer (LocalDatabase) dispatches a `local-db-changed`
 * window event after every write. The browser fires a `storage` event in other
 * tabs when localStorage changes. Together they give instant, cross-tab live
 * updates without any polling — the same mechanism every feed in the app uses.
 *
 * The fetcher runs on mount and after every event. The subscription is cleaned
 * up on unmount (no duplicate listeners, no leaks).
 */
export function useDbSync(
  fetch: () => void | Promise<void>,
  deps: unknown[] = []
) {
  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (!cancelled) void fetch();
    };

    run();

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) run();
    };

    window.addEventListener("local-db-changed", run);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("local-db-changed", run);
      window.removeEventListener("storage", onStorage);
    };
    // Callers pass stable fetchers via useCallback; deps control resubscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
