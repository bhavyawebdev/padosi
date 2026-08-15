import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Form";
import { ApiError } from "@/lib/api";
import { useForgotPassword, useRecoverEmail } from "@/features/auth/authHooks";
import { cn } from "@/lib/cn";
import { AuthLayout } from "./AuthLayout";

type Mode = "reset" | "recover";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("reset");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string | null; url: string | null; expiresMin: number } | null>(null);
  const [recovered, setRecovered] = useState<{ email: string; name: string } | null>(null);

  const forgot = useForgotPassword();
  const recover = useRecoverEmail();

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await forgot.mutateAsync(email);
      setResult({ token: res.dev_reset_token, url: res.dev_reset_url, expiresMin: res.expires_min });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

  const onRecover = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await recover.mutateAsync(phone);
      if (res.found && res.email) {
        setRecovered({ email: res.email, name: res.name ?? "" });
      } else {
        setRecovered({ email: "", name: "" });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <AuthLayout subtitle="Security & access">
      {/* Mode tabs */}
      <div className="flex gap-1.5 bg-surface-container-low border border-outline-variant rounded-full p-1 mb-6">
        {(
          [
            { value: "reset", label: "Reset password" },
            { value: "recover", label: "Forgot my email" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setMode(tab.value);
              setError(null);
              setResult(null);
              setRecovered(null);
            }}
            className={cn(
              "flex-1 px-4 py-2 rounded-full text-label-md font-label-md transition-colors",
              mode === tab.value ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-variant",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "reset" ? (
        result ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed-dim/40 flex items-center justify-center text-primary">
              <span aria-hidden className="material-symbols-outlined text-[32px]">
                mark_email_read
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-headline-md font-headline-md text-on-background">Reset link ready</h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                In production this link is emailed to you. In this dev build it's shown here:
              </p>
              {result.token && (
                <code className="block break-all bg-surface-container-high rounded-lg px-4 py-3 text-label-sm font-label-sm text-on-surface">
                  {result.token}
                </code>
              )}
              <p className="text-label-sm font-label-sm text-on-surface-variant">
                Link valid for {result.expiresMin} minutes.
              </p>
            </div>
            {result.url && (
              <Button
                size="lg"
                className="w-full"
                icon="arrow_forward"
                onClick={() => navigate(result.url as string)}
              >
                Continue to reset
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={onReset} className="space-y-6">
            <Field label="Email" hint="We'll send you a secure reset link (shown here in dev).">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={forgot.isPending} icon="send">
              Send reset link
            </Button>
          </form>
        )
      ) : recovered ? (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed-dim/40 flex items-center justify-center text-primary">
            <span aria-hidden className="material-symbols-outlined text-[32px]">
              contact_mail
            </span>
          </div>
          {recovered.email ? (
            <div className="space-y-2">
              <h2 className="text-headline-md font-headline-md text-on-background">
                {recovered.name ? `${recovered.name.split(" ")[0]}'s account` : "Account found"}
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                The email on this account is:
              </p>
              <p className="text-body-lg font-body-lg text-primary font-bold">{recovered.email}</p>
              <Link
                to="/login"
                className="inline-block text-label-md font-label-md text-primary font-semibold underline-offset-2 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-headline-md font-headline-md text-on-background">No account found</h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                We couldn't find an account with that phone number.
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onRecover} className="space-y-6">
          <Field label="Phone number" hint="We'll show the email linked to this phone (dev shows it fully; production masks it).">
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98xxxxxx"
            />
          </Field>
          {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={recover.isPending} icon="contact_mail">
            Find my email
          </Button>
        </form>
      )}

      <p className="text-center text-body-md font-body-md text-on-surface-variant mt-6">
        Remembered it?{" "}
        <Link to="/login" className="text-primary font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
