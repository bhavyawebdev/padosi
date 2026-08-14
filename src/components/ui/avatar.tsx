import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function Avatar({ src, alt = "", fallback, size = "md", className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  const initial = fallback?.charAt(0).toUpperCase() ?? "?";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden",
        "bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]",
        "flex-shrink-0",
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label={alt || fallback || "Avatar"}
      {...props}
    >
      {src && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="font-semibold text-[var(--color-on-surface-variant)]"
          style={{ fontFamily: "var(--font-heading)" }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
    </div>
  );
}

export { Avatar };
