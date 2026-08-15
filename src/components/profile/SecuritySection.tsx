import { useState, type FormEvent } from "react";

import { Button } from "@/components/common/Button";
import { Field } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ApiError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { useChangePassword, useSignOutOthers } from "@/features/auth/authHooks";

export function SecuritySection() {
  const { user } = useAuth();
  const changePw = useChangePassword();
  const signOutOthers = useSignOutOthers();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [otherDevicesDone, setOtherDevicesDone] = useState(false);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password. Try again.");
    }
  };

  const onSignOutOthers = async () => {
    setError(null);
    setOtherDevicesDone(false);
    try {
      await signOutOthers.mutateAsync();
      setOtherDevicesDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

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
        {/* Sign out other devices */}
        <div className="bg-surface-container rounded-xl p-6 border border-surface-variant">
          <div className="flex items-center gap-2 mb-1">
            <span aria-hidden className="material-symbols-outlined text-primary text-[20px]">
              devices
            </span>
            <h3 className="text-headline-md font-headline-md text-on-background">Sessions & devices</h3>
          </div>
          <p className="text-body-md font-body-md text-on-surface-variant mb-4">
            If you lost a phone or signed in on a shared computer, you can end every other session
            in one tap. This device stays signed in.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            loading={signOutOthers.isPending}
            onClick={onSignOutOthers}
            icon="logout"
          >
            Sign out all other devices
          </Button>
          {otherDevicesDone && !error && (
            <p role="status" className="text-label-sm font-label-sm text-primary mt-3 flex items-center gap-1.5">
              <span aria-hidden className="material-symbols-outlined text-[16px]">
                check_circle
              </span>
              Other devices signed out.
            </p>
          )}
          <p className="text-label-sm font-label-sm text-on-surface-variant mt-2">
            You'll also be signed out elsewhere after a password change or reset.
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
            Your account is secured with an email and password.
            {user?.phone ? ` A recovery phone (${user.phone}) is linked.` : " Link a phone number in Edit profile for extra recovery options."}
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
