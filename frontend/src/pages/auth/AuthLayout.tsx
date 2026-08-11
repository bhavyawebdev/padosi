import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";

export function AuthLayout({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-dim">
      <div className="w-full max-w-md bg-background md:rounded-[24px] rounded-[24px] shadow-paper-lg flex flex-col overflow-hidden animate-slide-up">
        <header className="px-margin-mobile pt-8 pb-3 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          {subtitle && (
            <p className="text-label-md font-label-md text-on-surface-variant mt-2">{subtitle}</p>
          )}
        </header>
        <div className="px-margin-mobile py-5 space-y-8">{children}</div>
      </div>
    </div>
  );
}
