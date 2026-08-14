import { describe, it, expect } from "vitest";
import {
  isGoogleUser,
  isSessionVerified,
  requiresEmailVerification,
  accountTypeLabel,
} from "@/lib/auth/verification";

const googleUser = {
  app_metadata: { provider: "google" },
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
} as never;

const emailConfirmed = {
  app_metadata: { provider: "email" },
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
} as never;

const emailUnconfirmed = {
  app_metadata: { provider: "email" },
  email_confirmed_at: null,
} as never;

describe("Session verification", () => {
  it("treats Google sessions as verified via the provider", () => {
    expect(isGoogleUser(googleUser)).toBe(true);
    expect(isSessionVerified(googleUser)).toBe(true);
  });

  it("requires email_confirmed_at for email accounts", () => {
    expect(isSessionVerified(emailConfirmed)).toBe(true);
    expect(isSessionVerified(emailUnconfirmed)).toBe(false);
  });

  it("never treats a null session as verified", () => {
    expect(isSessionVerified(null)).toBe(false);
    expect(requiresEmailVerification(null)).toBe(false);
  });

  it("flags unverified email sessions as requiring verification", () => {
    expect(requiresEmailVerification(emailUnconfirmed)).toBe(true);
    expect(requiresEmailVerification(emailConfirmed)).toBe(false);
    expect(requiresEmailVerification(googleUser)).toBe(false);
  });

  it("labels the account type for the UI", () => {
    expect(accountTypeLabel(googleUser)).toBe("Google account");
    expect(accountTypeLabel(emailConfirmed)).toBe("email account");
  });
});
