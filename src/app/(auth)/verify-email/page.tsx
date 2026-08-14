"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MailCheck,
  RefreshCw,
  Mail,
  ShieldCheck,
  LogOut,
  ArrowLeft,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, emailVerified } = useAuth();

  const email = searchParams.get("email") ?? "";
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState("");
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  const [changeState, setChangeState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [changeError, setChangeError] = useState("");

  // Once the account becomes verified (link opened in this or another tab),
  // send the user into the app.
  useEffect(() => {
    if (emailVerified && user) {
      router.replace("/home");
    }
  }, [emailVerified, user, router]);

  const handleResend = async () => {
    setResendState("sending");
    setResendError("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setResendError(body.error ?? "Couldn't send the email. Please try again.");
        setResendState("error");
        return;
      }
      setResendState("sent");
    } catch {
      setResendError("Network trouble. Please try again.");
      setResendState("error");
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === email) return;
    setChangeState("sending");
    setChangeError("");
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        // 401 happens when the session isn't established yet (fresh signups
        // have no session until their email is confirmed) — explain it.
        setChangeError(
          res.status === 401
            ? "You'll need to verify the current email first — sign out and sign up again with the correct address if you typed it wrong."
            : body.error ?? "Couldn't update the email. Please try again."
        );
        setChangeState("error");
        return;
      }
      setChangeState("sent");
    } catch {
      setChangeError("Network trouble. Please try again.");
      setChangeState("error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center mx-auto mb-3">
            <MailCheck size={28} />
          </div>
          <h2 className="headline-lg text-on-surface font-extrabold tracking-tight">
            Check your inbox
          </h2>
          <p className="body-md text-on-surface-variant">
            We sent a verification link to{" "}
            <span className="font-semibold text-on-surface">{email || "your email"}</span>.
            Open it to activate your account — unverified accounts can&apos;t
            access the community yet.
          </p>
        </div>

        {resendState === "sent" && (
          <div className="p-4 rounded-2xl bg-primary-container/60 text-on-primary-container label-md flex items-center gap-2">
            <ShieldCheck size={18} />
            <span>Verification email sent. Check your inbox (and spam folder).</span>
          </div>
        )}
        {resendState === "error" && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">
            {resendError}
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full hover-lift"
            onClick={handleResend}
            disabled={resendState === "sending"}
            isLoading={resendState === "sending"}
            leftIcon={resendState !== "sending" ? <RefreshCw size={18} /> : undefined}
          >
            Resend verification email
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full hover-lift"
            onClick={() => setShowChangeEmail((v) => !v)}
          >
            Change email
          </Button>

          {user && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full text-on-surface-variant"
              onClick={() => {
                logout();
              }}
              leftIcon={<LogOut size={18} />}
            >
              Log out
            </Button>
          )}
        </div>

        {showChangeEmail && (
          <div className="space-y-3 pt-2 border-t border-outline-variant/20">
            {changeState === "sent" ? (
              <div className="p-4 rounded-2xl bg-primary-container/60 text-on-primary-container label-md">
                A confirmation link has been sent to the new address. Please
                verify it there.
              </div>
            ) : (
              <>
                <Input
                  label="New email address"
                  type="email"
                  name="newEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  leftIcon={<Mail size={18} />}
                  placeholder="you@example.com"
                  required
                />
                {changeState === "error" && (
                  <p className="label-sm text-error">{changeError}</p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleChangeEmail}
                  disabled={changeState === "sending" || !newEmail || newEmail === email}
                  isLoading={changeState === "sending"}
                >
                  Send confirmation to new email
                </Button>
              </>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-outline-variant/20">
          <Link
            href="/login"
            className="label-md text-primary font-semibold inline-flex items-center gap-1.5 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
