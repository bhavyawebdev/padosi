"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, ShieldCheck, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      const res = await resetPassword(email);
      if (res.error) {
        setError(res.error);
      } else {
        // Anti-enumeration: respond identically whether or not the account exists.
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold font-heading">Forgot password</h2>
          <p className="text-[var(--color-on-surface-variant)] mt-1">
            Enter your email to reset your password
          </p>
        </div>

        {sent && (
          <div className="p-4 rounded-2xl bg-primary-container/60 text-on-primary-container label-md flex items-center gap-2">
            <ShieldCheck size={18} />
            <span>If an account exists, a password reset link has been sent.</span>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-[var(--color-error)] bg-[var(--color-error-container)] rounded-md">
            {error}
          </div>
        )}

        {!sent ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={18} />}
              required
              disabled={isPending}
            />

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isPending}
              disabled={isPending}
            >
              Send reset link
            </Button>
          </form>
        ) : (
          <div className="text-center">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Use a different email
            </Button>
          </div>
        )}

        <div className="text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-[var(--color-primary)] inline-flex items-center gap-1.5 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </div>
    </Card>
  );
}
