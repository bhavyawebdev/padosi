import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "./AuthLayout";

/** Shared demo credentials shown on the login screen for easy access. */
const DEMO_ACCOUNTS = [
  {
    role: "Customer",
    email: "demo@localpulse.dev",
    password: "password123",
    icon: "person",
    note: "Regular neighbour account",
  },
  {
    role: "Admin",
    email: "admin@localpulse.dev",
    password: "password123",
    icon: "admin_panel_settings",
    note: "Full admin console access",
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectAfterLogin = () => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== "/login" ? from : "/nearby", { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const signIn = async (emailValue: string, passwordValue: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: emailValue, password: passwordValue }, remember);
      redirectAfterLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /** One-click demo login: fills the form and signs in immediately. */
  const quickLogin = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    void signIn(account.email, account.password);
  };

  return (
    <AuthLayout subtitle="What's happening near you, right now.">
      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        {error && (
          <p role="alert" className="text-label-md font-label-md text-error bg-error-container/40 rounded-xl px-5 py-3">
            {error}
          </p>
        )}

        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password">
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="w-5 h-5 rounded-md border border-outline-variant bg-surface flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-colors">
              <span aria-hidden className="material-symbols-outlined text-[14px] text-on-primary opacity-0 peer-checked:opacity-100" style={{ fontVariationSettings: "'FILL'1" }}>
                check
              </span>
            </span>
            <span className="text-label-sm font-label-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Keep me signed in</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-label-sm font-label-sm text-primary font-semibold underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Sign in
        </Button>

        <p className="text-center text-body-md font-body-md text-on-surface-variant">
          New to LocalPulse?{" "}
          <Link to="/signup" className="text-primary font-semibold underline-offset-2 hover:underline">
            Join your neighborhood
          </Link>
        </p>
      </form>

      {/* Demo access — customer + admin credentials, one-click sign-in */}
      <div className="mt-8 bg-surface-container-low rounded-2xl border border-outline-variant p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL'1" }}>
            key
          </span>
          <h2 className="text-label-md font-label-md text-on-background font-bold">Demo access</h2>
          <span className="text-label-sm font-label-sm text-on-surface-variant">
            (dev only — change in production)
          </span>
        </div>
        {DEMO_ACCOUNTS.map((account) => (
          <div
            key={account.role}
            className="flex items-center gap-3 bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3"
          >
            <span className="w-9 h-9 rounded-full bg-primary-container/40 flex items-center justify-center text-primary shrink-0">
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                {account.icon}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-md font-label-md text-on-background">
                {account.role} <span className="text-on-surface-variant font-normal">· {account.note}</span>
              </p>
              <p className="text-label-sm font-label-sm text-on-surface-variant truncate">
                {account.email} · {account.password}
              </p>
            </div>
            <button
              type="button"
              onClick={() => quickLogin(account)}
              disabled={submitting}
              className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-on-primary px-3.5 py-2 rounded-full text-label-sm font-label-sm hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span aria-hidden className="material-symbols-outlined text-[16px]">
                login
              </span>
              Sign in
            </button>
          </div>
        ))}
      </div>
    </AuthLayout>
  );
}
