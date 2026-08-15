import { useCallback, useSyncExternalStore } from "react";

export type SaveKind = "post" | "request" | "provider";

const STORAGE_KEY = "lp_saved";

type SavedMap = Record<SaveKind, string[]>;

const EMPTY: SavedMap = { post: [], request: [], provider: [] };

let cache: SavedMap | null = null;
const listeners = new Set<() => void>();

function read(): SavedMap {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SavedMap>) : {};
    cache = {
      post: Array.isArray(parsed.post) ? parsed.post : [],
      request: Array.isArray(parsed.request) ? parsed.request : [],
      provider: Array.isArray(parsed.provider) ? parsed.provider : [],
    };
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: SavedMap) {
  cache = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSaved(): SavedMap {
  return read();
}

export function isSaved(kind: SaveKind, id: string): boolean {
  return read()[kind].includes(id);
}

export function toggleSaved(kind: SaveKind, id: string): boolean {
  const map = read();
  const list = map[kind];
  const exists = list.includes(id);
  write({
    ...map,
    [kind]: exists ? list.filter((x) => x !== id) : [...list, id],
  });
  return !exists;
}

/** React hook — re-renders when the saved set changes (any tab via storage?). */
export function useSaved(kind: SaveKind, id: string): { saved: boolean; toggle: () => void } {
  const snapshot = useSyncExternalStore(subscribe, () => read()[kind].includes(id));
  const toggle = useCallback(() => toggleSaved(kind, id), [kind, id]);
  return { saved: snapshot, toggle };
}

/** All saved ids per kind (for the Saved page). */
export function useSavedIds(): SavedMap {
  return useSyncExternalStore(subscribe, read);
}
