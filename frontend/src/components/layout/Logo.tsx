/**
 * Padosi logo — inline SVG recolored to the canonical palette primary
 * (#416448) so the mark is pixel-consistent with the UI. The original Stitch
 * assets used a slightly different green; per the brief, the UI palette wins.
 * House + pulse motif. Clear space respected via the padded viewBox.
 */
import { cn } from "@/lib/cn";

interface LogoProps {
  /** Show the wordmark next to the mark. */
  withWordmark?: boolean;
  /** On a primary/dark background — use the on-primary tint. */
  dark?: boolean;
  className?: string;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Padosi"
      className={cn("h-7 w-7", className)}
      fill="none"
    >
      {/* house */}
      <path
        d="M6 14.5 16 6l10 8.5V26a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 6 26V14.5Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* pulse line — "local pulse" */}
      <path
        d="M8.5 16.5h4l2-5 3.5 9 2-4h3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ withWordmark = true, dark = false, className }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", dark ? "text-on-primary" : "text-primary", className)}
    >
      <LogoMark />
      {withWordmark && (
        <span className="font-headline-md text-headline-md font-bold tracking-tight">Padosi</span>
      )}
    </span>
  );
}
