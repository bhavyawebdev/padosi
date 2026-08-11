import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ChipProps {
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  /** Overrides the default active pill look (avoids conflicting utilities). */
  activeClassName?: string;
  tone?: "neutral" | "primary" | "secondary" | "tertiary";
}

const toneClasses: Record<NonNullable<ChipProps["tone"]>, string> = {
  neutral: "bg-surface-container-low text-on-surface-variant border border-outline-variant hover:bg-surface-variant",
  primary: "bg-primary-fixed-dim/30 text-on-primary-fixed-variant border border-primary-fixed-dim",
  secondary: "bg-secondary-fixed/50 text-on-secondary-container border border-secondary-fixed-dim",
  tertiary: "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant border border-tertiary-fixed-dim",
};

export function Chip({ label, icon, active, onClick, className, activeClassName, tone = "neutral" }: ChipProps) {
  const Comp: "button" | "span" = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap px-3 py-1.5 rounded-full text-label-md font-label-md inline-flex items-center gap-1 transition-all",
        active
          ? activeClassName ?? "bg-primary-container text-on-primary-container shadow-sm"
          : toneClasses[tone],
        onClick && "active:scale-95 cursor-pointer",
        className,
      )}
    >
      {icon && (
        <span aria-hidden className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL'1" }}>
          {icon}
        </span>
      )}
      {label}
    </Comp>
  );
}

/** Small round verified check (screen 01: bg-primary circle + check icon). */
export function VerifiedMark({ className }: { className?: string }) {
  return (
    <span
      title="Verified"
      className={cn("bg-primary w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0", className)}
    >
      <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 10, fontVariationSettings: "'FILL'1" }}>
        check
      </span>
    </span>
  );
}

/** "Verified by N neighbors" trust chip (screen 02) — the core trust signal. */
export function VerifiedByChip({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-label-sm font-label-sm border border-primary/20",
        className,
      )}
    >
      <span aria-hidden className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL'1" }}>
        check_circle
      </span>
      Verified by {count} {count === 1 ? "neighbor" : "neighbors"}
    </span>
  );
}

/** Small tinted tag used for statuses/labels (e.g. "Need to Borrow"). */
export function Tag({ icon, label, tone = "neutral", children }: { icon?: string; label?: string; tone?: ChipProps["tone"]; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-label-sm font-label-sm", toneClasses[tone])}>
      {icon && (
        <span aria-hidden className="material-symbols-outlined text-sm">
          {icon}
        </span>
      )}
      {label ?? children}
    </span>
  );
}
