import { useSaved, type SaveKind } from "@/features/saved/savedStore";
import { cn } from "@/lib/cn";

interface SaveButtonProps {
  kind: SaveKind;
  id: string;
  label?: string;
  className?: string;
}

export function SaveButton({ kind, id, label, className }: SaveButtonProps) {
  const { saved, toggle } = useSaved(kind, id);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : `Save to saved items`}
      title={saved ? "Remove from saved" : "Save"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-md font-label-md transition-colors active:scale-95",
        saved
          ? "bg-secondary-fixed/60 text-on-secondary-container"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-variant",
        className,
      )}
    >
      <span
        aria-hidden
        className="material-symbols-outlined text-[18px]"
        style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
      >
        {saved ? "bookmark" : "bookmark_border"}
      </span>
      {label && <span className="hidden sm:inline">{saved ? "Saved" : label}</span>}
    </button>
  );
}
