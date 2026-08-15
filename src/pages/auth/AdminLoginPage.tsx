import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/layout/Logo";

/**
 * Admin Portal login — a completely separate experience from the customer
 * site. No demo credentials, no signup, no role selector. Authorization is
 * decided by Supabase Auth + the database-backed role; if the signed-in
 * account isn't an admin or community (RWA) account, access is denied without
 * revealing anything about who can enter.
 */
export function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "community") {
        // Community accounts have their own customer-side dashboard — the
        // admin portal is platform-admin only.
        navigate("/community", { replace: true });
      } else {
        // Deny without confirming whether admin accounts exist or who they are.
        setError("This account doesn't have access to the admin area.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-dim/40 text-on-background">
      {/* Admin-branded top bar */}
      <header className="bg-primary text-on-primary">
        <div className="max-w-md mx-auto px-6 py-5 flex items-center gap-3">
          <Logo dark />
          <div>
            <p className="text-label-md font-label-md font-bold leading-tight">Admin Portal</p>
            <p className="text-label-sm font-label-sm text-on-primary/80">LocalPulse platform console</p>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-8 animate-card-enter">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <span className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span aria-hidden className="material-symbols-outlined text-[30px]">
                  admin_panel_settings
                </span>
              </span>
            </div>
            <h1 className="font-headline-lg font-bold text-2xl">Sign in to the Admin Portal</h1>
            <p className="text-body-md font-body-md text-on-surface-variant mt-2">
              Authorized administrators and society (RWA) accounts only.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6" noValidate>
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

            <Button type="submit" size="lg" className="w-full" loading={submitting} icon="login">
              Sign in to admin
            </Button>
          </form>

          <p className="text-center text-label-sm font-label-sm text-on-surface-variant mt-6">
            Not an admin?{" "}
            <Link to="/login" className="text-primary font-semibold underline-offset-2 hover:underline">
              Return to the community site
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-outline-variant/40 bg-surface-container-low py-6 text-center text-xs text-on-surface-variant">
        © 2026 LocalPulse · Admin Portal
      </footer>
    </div>
  );
}
