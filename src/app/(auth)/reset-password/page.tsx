"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword, user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Only reachable with an active session (created by the recovery callback).
  // Wait for session restore before deciding — otherwise a valid recovery link
  // flashes past /forgot-password while auth is still loading.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/forgot-password");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password should be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsPending(true);
    try {
      const res = await updatePassword(password);
      if (res.error) {
        setError(res.error);
      } else {
        setMessage("Password successfully updated.");
        setTimeout(() => router.push("/home"), 1500);
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
          <h2 className="text-2xl font-bold font-heading">Reset password</h2>
          <p className="text-[var(--color-on-surface-variant)] mt-1">
            Enter your new password below
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-primary-container/60 text-on-primary-container label-md flex items-center gap-2">
            <ShieldCheck size={18} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-[var(--color-error)] bg-[var(--color-error-container)] rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="password"
            name="password"
            type="password"
            label="New password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            required
            disabled={isPending}
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            required
            disabled={isPending}
          />

          <Button type="submit" className="w-full mt-2" isLoading={isPending} disabled={isPending}>
            Update password
          </Button>
        </form>
      </div>
    </Card>
  );
}
