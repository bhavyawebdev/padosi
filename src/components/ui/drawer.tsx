"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, title, children, className }: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-on-surface/20 backdrop-blur-xs transition-opacity duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
        className={cn(
          "relative z-10 w-full max-h-[90vh] overflow-y-auto bg-surface-container-lowest",
          "rounded-t-[32px] border-t border-outline-variant/30 p-6 shadow-2xl animate-in slide-in-from-bottom duration-250",
          className
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)" }}
      >
        <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
          {title ? (
            <h3 id="drawer-title" className="headline-md font-bold text-on-surface">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
