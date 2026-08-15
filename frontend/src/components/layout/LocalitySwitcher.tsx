import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useLocalities } from "@/features/auth/authHooks";
import { useViewLocality } from "@/features/locality/localityStore";
import { cn } from "@/lib/cn";

export function LocalitySwitcher({ className }: { className?: string }) {
  const { user } = useAuth();
  const { view, setView } = useViewLocality();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: localities } = useLocalities(undefined, q);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = view ? view.name : (user?.locality?.name ?? "Your area");

  return (
    <div className={cn("relative", className)} ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Change viewing area"
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-variant text-label-md font-label-md transition-colors max-w-[180px]"
      >
        <span aria-hidden className="material-symbols-outlined text-[18px] text-primary">
          location_on
        </span>
        <span className="truncate">{label}</span>
        <span aria-hidden className="material-symbols-outlined text-[16px]">
          expand_more
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="listbox"
            aria-label="Localities"
            className="absolute left-0 mt-2 z-50 w-64 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-paper-lg overflow-hidden"
          >
            <div className="p-3 border-b border-outline-variant/60">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search your area…"
                aria-label="Search localities"
                className="w-full bg-surface rounded-lg border border-outline-variant px-3 py-2 text-label-md font-label-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              <li>
                <button
                  onClick={() => {
                    setView(null);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-label-md font-label-md hover:bg-surface-container-low transition-colors",
                    !view && "bg-primary/10 text-primary",
                  )}
                >
                  My area
                </button>
              </li>
              {(localities ?? []).map((loc) => (
                <li key={loc.id}>
                  <button
                    onClick={() => {
                      setView(loc);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 hover:bg-surface-container-low transition-colors",
                      view?.id === loc.id && "bg-primary/10 text-primary",
                    )}
                  >
                    <span className="block text-label-md font-label-md truncate">{loc.name}</span>
                    <span className="block text-label-sm font-label-sm text-on-surface-variant truncate">
                      {loc.city} · {loc.state}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
