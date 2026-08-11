import { cn } from "@/lib/cn";

export function Stars({ rating, className }: { rating: number | null | undefined; className?: string }) {
  if (rating === null || rating === undefined) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-secondary", className)}>
      <span aria-hidden className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL'1" }}>
        star
      </span>
      <span className="text-label-md font-label-md">{rating.toFixed(1)}</span>
    </span>
  );
}

interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
}

/** Interactive 1–5 star selector for reviews. */
export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={cn(
            "material-symbols-outlined text-[28px] transition-transform hover:scale-110 active:scale-95",
            n <= value ? "text-secondary" : "text-outline-variant",
          )}
          style={{ fontVariationSettings: n <= value ? "'FILL'1" : "'FILL'0" }}
        >
          star
        </button>
      ))}
    </div>
  );
}
