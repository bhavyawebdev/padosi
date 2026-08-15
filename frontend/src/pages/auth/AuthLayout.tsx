import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/layout/Logo";

export function AuthLayout({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      {/* Header with backdrop blur */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-outline-variant/40 header-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-9 font-medium text-sm text-on-surface-variant">
            <Link className="hover:text-primary transition-colors duration-200" to="/">Nearby Right Now</Link>
            <Link className="hover:text-primary transition-colors duration-200" to="/">Verified Help</Link>
            <Link className="hover:text-primary transition-colors duration-200" to="/">Need It Now</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-semibold text-on-surface px-4 py-2.5 rounded-full hover:bg-surface-container transition-colors duration-200">
              Log in
            </Link>
            <Link to="/signup" className="bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors duration-200 shadow-sm btn-press">
              Find your area
            </Link>
          </div>
        </div>
      </header>

      {/* Auth card — centered with entrance animation */}
      <main className="flex-grow flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-outline-variant/40 shadow-xl p-8 animate-card-enter">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3 animate-scale-in">
              <span className="material-symbols-outlined text-primary text-4xl">monitor_heart</span>
            </div>
            <h1 className="font-headline-lg font-bold text-2xl text-on-background animate-fade-in" style={{ animationDelay: "0.1s" }}>Padosi</h1>
            {subtitle && (
              <p className="text-body-md font-body-md text-on-surface-variant mt-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>{subtitle}</p>
            )}
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/40 bg-surface-container-low py-6 text-center text-xs text-on-surface-variant">
        © 2026 Padosi. Made for your street.
      </footer>
    </div>
  );
}
