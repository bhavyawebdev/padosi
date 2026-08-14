import Link from "next/link";

/**
 * Auth Layout — Centers content vertically and horizontally.
 * Card max-width 400px, 32px padding.
 * Logo centered above with 24px gap to heading.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Brand mark — centered, 24px gap below */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] rounded-md"
          >
            <div className="h-12 w-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-[var(--color-primary-container)]">
              <span className="text-[var(--color-primary)] font-bold text-xl" style={{ fontFamily: "var(--font-heading)" }}>
                A
              </span>
            </div>
            <h1
              className="text-2xl font-bold text-[var(--color-primary)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Aas-Paas
            </h1>
            <p className="text-sm mt-1 text-[var(--color-on-surface-variant)]">
              Your Neighborhood Network
            </p>
          </Link>
        </div>

        {/* Page content — the page provides its own card */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
