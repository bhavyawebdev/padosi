import { useViewLocality } from "@/features/locality/localityStore";
import { LocalitySwitcher } from "./LocalitySwitcher";

/**
 * Locality context row — the "Browsing X" chip plus the mobile-only switcher.
 * Desktop users switch locality from the header; mobile users get it here
 * (the header switcher is hidden below xl to keep the row uncrowded).
 */
export function LocalityContextRow() {
  const { view, setView } = useViewLocality();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {view && (
        <span className="inline-flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant bg-primary-container/60 rounded-full px-3 py-1.5">
          <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">
            location_on
          </span>
          Browsing {view.name}
          <button
            onClick={() => setView(null)}
            aria-label="Back to my area"
            className="text-on-surface-variant hover:text-on-background transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-[14px]">
              close
            </span>
          </button>
        </span>
      )}
      <div className="md:hidden">
        <LocalitySwitcher />
      </div>
    </div>
  );
}
