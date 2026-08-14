import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="text-center max-w-sm">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-surface-container)" }}
        >
          <span className="text-3xl" aria-hidden="true">📍</span>
        </div>
        <h1
          className="text-6xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          404
        </h1>
        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-on-surface)" }}
        >
          Page not found
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-on-surface-variant)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
            fontFamily: "var(--font-heading)",
            outlineColor: "var(--color-primary)",
          }}
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
