import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Form";
import { ApiError } from "@/lib/errors";
import { useForgotPassword } from "@/features/auth/authHooks";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const forgot = useForgotPassword();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await forgot.mutateAsync(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <AuthLayout subtitle="Security & access">
      {sent ? (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed-dim/40 flex items-center justify-center text-primary">
            <span aria-hidden className="material-symbols-outlined text-[32px]">
              mark_email_read
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-headline-md font-headline-md text-on-background">Check your inbox</h2>
            <p className="text-body-md font-body-md text-on-surface-variant">
              If an account exists for <span className="text-on-surface font-semibold">{email}</span>, a secure
              password reset link is on its way. The link expires after a few minutes.
            </p>
            <p className="text-label-sm font-label-sm text-on-surface-variant">
              Didn't get it? Check spam, or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-primary font-semibold underline-offset-2 hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <Field label="Email" hint="We'll email you a secure link to reset your password.">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          {error && (
            <p role="alert" className="text-label-md font-label-md text-error bg-error-container/40 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={forgot.isPending} icon="send">
            Send reset link
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
