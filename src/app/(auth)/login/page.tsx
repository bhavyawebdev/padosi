"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Building, ArrowRight, ShieldCheck } from "lucide-react";

/** Inline Google "G" logo — matches brand guidelines. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signInWithPassword, signInWithGoogle, isGoogleLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pick up error from OAuth callback redirect (e.g. /login?error=...)
  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      const message = decodeURIComponent(callbackError);
      queueMicrotask(() => setError(message));
    }
  }, [searchParams]);

  const isAnyLoading = isLoading || isGoogleLoading;

  // Are the Supabase env vars present? (Exposed to the client as NEXT_PUBLIC_*.)
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Email/password goes through Supabase Auth (the real identity system).
    if (supabaseConfigured) {
      setIsLoading(true);
      try {
        const res = await signInWithPassword(email, password);
        if (res.requiresVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        if (res.error) {
          setError(res.error);
        } else {
          router.push("/home");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Fallback: local demo layer when Supabase isn't configured.
    setIsLoading(true);
    try {
      const res = await login(email);
      if (res.error) {
        setError(res.error);
      } else {
        router.push("/home");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const res = await login("demo@aaspaas.community");
      if (res.error) {
        setError(res.error);
      } else {
        router.push("/home");
      }
    } catch (_err: unknown) {
      setError("Demo login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    const res = await signInWithGoogle();
    if (res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center mb-3">
            <Building size={24} />
          </div>
          <h2 className="headline-lg text-on-surface font-extrabold tracking-tight">
            Welcome back
          </h2>
          <p className="body-md text-on-surface-variant">
            Sign in to connect with your neighbours and discover local updates.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md flex items-center gap-2">
            <ShieldCheck size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full hover-lift"
          onClick={handleGoogleLogin}
          disabled={isAnyLoading}
          isLoading={isGoogleLoading}
          leftIcon={!isGoogleLoading ? <GoogleIcon /> : undefined}
          id="google-login-btn"
        >
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative flex items-center gap-4">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="label-sm text-on-surface-variant uppercase tracking-widest">
            or
          </span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={18} />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full hover-lift mt-2"
            isLoading={isLoading}
            disabled={isAnyLoading}
            rightIcon={<ArrowRight size={18} />}
          >
            Sign In
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full hover-lift"
            onClick={handleDemoLogin}
            disabled={isAnyLoading}
          >
            Explore with Demo Account
          </Button>
        </form>

        <div className="pt-4 border-t border-outline-variant/20 text-center">
          <p className="body-md text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Join Aas-Paas
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
