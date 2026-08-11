import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Locality } from "@/types";

const STORAGE_KEY = "lp_view_locality";

interface ViewLocalityContextValue {
  /** The locality currently being browsed (null = "my area"). */
  view: Locality | null;
  setView: (locality: Locality | null) => void;
}

const ViewLocalityContext = createContext<ViewLocalityContextValue | null>(null);

function readStored(): Locality | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Locality;
    // Validate the full shape — old entries saved before the `state` field
    // existed (or after a schema change) are dropped rather than leaking
    // undefined values through the app.
    if (
      parsed &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.city === "string" &&
      typeof parsed.state === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function ViewLocalityProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<Locality | null>(() => readStored());

  useEffect(() => {
    if (view) localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    else localStorage.removeItem(STORAGE_KEY);
  }, [view]);

  const setView = useCallback((locality: Locality | null) => {
    setViewState(locality);
  }, []);

  const value = useMemo(() => ({ view, setView }), [view, setView]);
  return (
    <ViewLocalityContext.Provider value={value}>
      {children}
    </ViewLocalityContext.Provider>
  );
}

export function useViewLocality(): ViewLocalityContextValue {
  const ctx = useContext(ViewLocalityContext);
  if (!ctx) throw new Error("useViewLocality must be used inside <ViewLocalityProvider>");
  return ctx;
}
