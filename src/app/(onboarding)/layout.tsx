export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="w-full max-w-md">
        {/* Progress indicator placeholder */}
        <div className="flex gap-2 mb-8 justify-center">
          {[1, 2].map((step) => (
            <div
              key={step}
              className="h-1.5 w-12 rounded-full"
              style={{
                background: step === 1 ? "var(--color-primary)" : "var(--color-outline-variant)",
              }}
              aria-hidden="true"
            />
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
