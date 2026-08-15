import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Width class for the desktop panel, e.g. "md:max-w-md". */
  panelClassName?: string;
}

export function Modal({ open, onClose, title, children, footer, panelClassName = "md:max-w-md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/25 p-0 md:p-margin-desktop"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn("w-full bg-background md:rounded-[24px] rounded-t-[24px] shadow-lg flex flex-col overflow-hidden animate-slide-up", panelClassName)}
        style={{ maxHeight: "92dvh" }}
      >
        <header className="flex justify-between items-center px-margin-mobile py-5 bg-background border-b border-surface-variant">
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -ml-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined">
              close
            </span>
          </button>
          <h2 className="font-headline-md text-headline-md text-on-background flex-1 text-center font-bold tracking-tight">
            {title}
          </h2>
          <div className="w-10" />
        </header>
        <div className="flex-1 overflow-y-auto px-margin-mobile py-8 space-y-12">{children}</div>
        {footer && (
          <footer className="p-margin-mobile bg-surface-container-low border-t border-surface-variant shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
