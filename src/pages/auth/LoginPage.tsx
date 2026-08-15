import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/errors";
import { homePathForRole } from "@/lib/roles";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // A notice carried over from signup ("check your email…").
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;

  const redirectAfterLogin = (user: User) => {
    const from = (location.state as { from?: string } | null)?.from;
    // A guarded-page redirect wins for the normal customer flows; otherwise
    // each account type lands on its own dashboard. Admins are never sent
    // back to a customer page from here.
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (from && from !== "/login") {
      navigate(from, { replace: true });
      return;
    }
    navigate(homePathForRole(user.role), { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password }, remember);
      redirectAfterLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout subtitle="What's happening near you, right now.">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {notice && (
          <p role="status" className="text-label-md font-label-md text-primary bg-primary/10 rounded-xl px-5 py-3">
            {notice}
          </p>
        )}
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
            <span className="w-5 h-5 rounded-md border border-outline-variant bg-surface-container-lowest flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-colors">
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
    </AuthLayout>
  );
}
