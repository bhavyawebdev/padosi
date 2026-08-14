"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Aas-Paas] Application error:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="text-center max-w-sm">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-error-container)" }}
        >
          <AlertCircle size={32} style={{ color: "var(--color-on-error-container)" }} aria-hidden="true" />
        </div>
        <h1
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
        >
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-on-surface-variant)" }}>
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs mb-4 font-mono" style={{ color: "var(--color-on-surface-variant)", opacity: 0.6 }}>
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full h-11 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
              fontFamily: "var(--font-heading)",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center border transition-colors hover:bg-[var(--color-surface-container)]"
            style={{
              borderColor: "var(--color-outline-variant)",
              color: "var(--color-on-surface)",
              fontFamily: "var(--font-heading)",
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
