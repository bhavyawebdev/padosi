import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { useResetPassword } from "@/features/auth/authHooks";
import { AuthLayout } from "./AuthLayout";

/**
 * Landed on after clicking the Supabase recovery email link. The recovery
 * session is picked up automatically by the client from the URL hash; we only
 * need to confirm it exists, then let the user pick a new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryActive, setRecoveryActive] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const reset = useResetPassword();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // A recovery link lands on this page WITH a session (type recovery).
      setRecoveryActive(Boolean(data.session));
    });
  }, []);

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
    try {
      await reset.mutateAsync({ newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password. The link may have expired.");
    }
  };

  if (done) {
    return (
      <AuthLayout subtitle="Choose a new password">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed-dim/40 flex items-center justify-center text-primary">
            <span aria-hidden className="material-symbols-outlined text-[32px]">
              check_circle
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-headline-md font-headline-md text-on-background">Password updated</h2>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Your password has been changed and you've been signed out everywhere for safety. Log in with your new password.
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
      </AuthLayout>
    );
  }

  if (recoveryActive === null) {
    return (
      <AuthLayout subtitle="Choose a new password">
        <p className="text-center text-body-md font-body-md text-on-surface-variant py-10">Checking your link…</p>
      </AuthLayout>
    );
  }

  if (recoveryActive === false) {
    return (
      <AuthLayout subtitle="Choose a new password">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-error-container/50 flex items-center justify-center text-on-error-container">
            <span aria-hidden className="material-symbols-outlined text-[32px]">
              link_off
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-headline-md font-headline-md text-on-background">Link invalid or expired</h2>
            <p className="text-body-md font-body-md text-on-surface-variant">
              This reset link isn't valid anymore. Request a fresh one and try again.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              lock_reset
            </span>
            Request a new link
          </Link>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Or{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-primary font-semibold underline-offset-2 hover:underline"
            >
              sign in
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Choose a new password">
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
        {error && (
          <p role="alert" className="text-label-md font-label-md text-error bg-error-container/40 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending} icon="lock_reset">
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
