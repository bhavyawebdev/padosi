import { useState, type FormEvent } from "react";

import { Button } from "@/components/common/Button";
import { Field } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/api";
import { getSessionId, useAuth } from "@/hooks/useAuth";
import { useChangePassword, useSessions, useSignOutOthers } from "@/features/auth/authHooks";
import { timeAgo } from "@/lib/geo";
import { cn } from "@/lib/cn";

function browserLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser, isMobile ? "mobile" : "desktop"].filter(Boolean).join(" · ");
}

export function SecuritySection() {
  const { user } = useAuth();
  const sessions = useSessions();
  const changePw = useChangePassword();
  const signOutOthers = useSignOutOthers();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const currentSessionId = getSessionId();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("New password must differ from the current one.");
      return;
    }
    try {
      await changePw.mutateAsync({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      // The hook swaps the token synchronously and invalidates ["sessions"],
      // so the audit list below refreshes with the new (still-valid) token.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password. Try again.");
    }
  };

  const onSignOutOthers = async () => {
    setError(null);
    try {
      await signOutOthers.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

  const sessionRows = sessions.data ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
      {/* Change password */}
      <div className="bg-surface-container rounded-xl p-6 border border-surface-variant">
        <div className="flex items-center gap-2 mb-1">
          <span aria-hidden className="material-symbols-outlined text-primary text-[20px]">
            password
          </span>
          <h3 className="text-headline-md font-headline-md text-on-background">Change password</h3>
        </div>
        <p className="text-body-md font-body-md text-on-surface-variant mb-5">
          Changing your password signs you out on every other device. This device stays signed in.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Current password">
            <PasswordInput
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </Field>
          <Field label="New password" hint="8+ characters — mixed case, numbers & symbols are best">
            <PasswordInput
              value={next}
              onChange={setNext}
              autoComplete="new-password"
              showStrength
              required
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirm new password">
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
          {done && !error && (
            <p role="status" className="text-label-md font-label-md text-primary bg-primary/10 rounded-xl px-4 py-3 flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              Password updated — all other devices signed out.
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={changePw.isPending} icon="lock_reset">
            Update password
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-gutter">
        {/* Recent sign-ins */}
        <div className="bg-surface-container rounded-xl p-6 border border-surface-variant">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined text-primary text-[20px]">
                devices
              </span>
              <h3 className="text-headline-md font-headline-md text-on-background">Recent sign-ins</h3>
            </div>
            <span className="text-label-sm font-label-sm text-on-surface-variant">
              {sessionRows.length} session{sessionRows.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-body-md font-body-md text-on-surface-variant mb-4">
            Devices that have signed in to this account. This device is marked below.
          </p>

          <div className="space-y-2">
            {sessions.isLoading ? (
              <p className="text-label-sm font-label-sm text-on-surface-variant py-2">Loading sessions…</p>
            ) : sessionRows.length === 0 ? (
              <p className="text-label-sm font-label-sm text-on-surface-variant py-2">No recorded sign-ins yet.</p>
            ) : (
              sessionRows.slice(0, 6).map((s) => {
                const isCurrent = s.id === currentSessionId;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3",
                      isCurrent ? "bg-primary/10 border-primary/30" : "bg-surface-container-lowest border-outline-variant/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                        isCurrent ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant",
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isCurrent ? "laptop" : "devices_other"}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-label-md font-label-md text-on-background truncate">
                        {browserLabel(s.user_agent)}
                        {isCurrent && <span className="text-primary font-bold"> · this device</span>}
                      </p>
                      <p className="text-label-sm font-label-sm text-on-surface-variant truncate">
                        {s.ip ?? "Unknown IP"} · {timeAgo(s.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full mt-4"
            loading={signOutOthers.isPending}
            onClick={onSignOutOthers}
            icon="logout"
          >
            Sign out all other devices
          </Button>
          <p className="text-label-sm font-label-sm text-on-surface-variant mt-2">
            Use this if you lost a phone or signed in on a shared computer.
          </p>
        </div>

        {/* Account email */}
        <div className="bg-surface-container rounded-xl p-6 border border-surface-variant">
          <div className="flex items-center gap-2 mb-1">
            <span aria-hidden className="material-symbols-outlined text-primary text-[20px]">
              shield_lock
            </span>
            <h3 className="text-headline-md font-headline-md text-on-background">Login details</h3>
          </div>
          <p className="text-body-md font-body-md text-on-surface-variant mb-3">
            Your account is secured with an email and password.{" "}
            {user?.phone ? `A recovery phone (${user.phone}) is linked — use it if you forget your email.` : "Link a phone number in Edit profile to add email recovery."}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 bg-surface-variant/50 px-3 py-1.5 rounded-lg text-label-sm font-label-sm text-on-surface">
              <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">alternate_email</span>
              {user?.email}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-surface-variant/50 px-3 py-1.5 rounded-lg text-label-sm font-label-sm text-on-surface">
              <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">password</span>
              Password protected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
