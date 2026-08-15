import { cn } from "@/lib/cn";

const TONES: Array<{ bg: string; fg: string }> = [
  { bg: "bg-primary-container", fg: "text-on-primary-container" },
  { bg: "bg-secondary-container", fg: "text-on-secondary-container" },
  { bg: "bg-tertiary-container", fg: "text-on-tertiary-container" },
  { bg: "bg-surface-variant", fg: "text-on-surface-variant" },
];

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-8 h-8 text-label-sm",
  md: "w-10 h-10 text-label-md",
  lg: "w-16 h-16 text-headline-md",
  xl: "w-20 h-20 text-headline-lg",
};

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const tone = TONES[hash(name) % TONES.length];
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-full inline-flex items-center justify-center font-bold shrink-0 border border-outline-variant/40",
        tone.bg,
        tone.fg,
        sizes[size],
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}
