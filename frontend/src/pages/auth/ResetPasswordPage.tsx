import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/api";
import { useResetPassword } from "@/features/auth/authHooks";
import { AuthLayout } from "./AuthLayout";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const reset = useResetPassword();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    try {
      await reset.mutateAsync({ token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password. The link may have expired.");
    }
  };

  return (
    <AuthLayout subtitle="Choose a new password">
      {done ? (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed-dim/40 flex items-center justify-center text-primary">
            <span aria-hidden className="material-symbols-outlined text-[32px]">
              check_circle
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-headline-md font-headline-md text-on-background">Password updated</h2>
            <p className="text-body-md font-body-md text-on-surface-variant">
              You've been signed out everywhere for safety. Log in with your new password.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              login
            </span>
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <Field label="New password" hint="8+ characters, mixed case, numbers and symbols are best.">
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showStrength
              required
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirm password">
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
              placeholder="••••••••"
            />
          </Field>
          {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={reset.isPending} icon="lock_reset">
            Reset password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
