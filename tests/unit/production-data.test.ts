import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPublicProfile,
  getUnreadNotificationCount,
  isProductionUnavailable,
} from "@/lib/data/production";
import { toFriendlyError, isMissingRelationError } from "@/lib/supabase/errors";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null, // unconfigured — the layer must fail gracefully
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Production data layer (graceful degradation)", () => {
  it("returns a friendly error instead of throwing when Supabase is unconfigured", async () => {
    const result = await getPublicProfile("user_1");
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    // Never leaks raw errors to the UI.
    expect(result.error?.code).toBeTruthy();
  });

  it("handles the notifications count path safely", async () => {
    const result = await getUnreadNotificationCount("user_1");
    expect(result.error).not.toBeNull();
  });
});

describe("Error mapping", () => {
  it("maps RLS violations to a generic unauthorized message", () => {
    const friendly = toFriendlyError({ code: "42501", message: "new row violates policy" });
    expect(friendly.code).toBe("auth/unauthorized");
  });

  it("maps duplicate key errors", () => {
    const friendly = toFriendlyError({ code: "23505", message: "duplicate key" });
    expect(friendly.code).toBe("duplicate");
  });

  it("maps network failures without exposing details", () => {
    const friendly = toFriendlyError(new Error("fetch failed: ECONNREFUSED"));
    expect(friendly.message).toContain("Network trouble");
  });

  it("never returns the raw database message", () => {
    const friendly = toFriendlyError({ code: "PGRST301", message: "secret internal detail" });
    expect(friendly.message).not.toContain("secret internal detail");
  });
});

describe("Missing-relation detection", () => {
  it("detects a missing table (migration not applied)", () => {
    expect(isMissingRelationError(new Error('relation "notifications" does not exist'))).toBe(true);
    expect(isProductionUnavailable(new Error('relation "posts" does not exist'))).toBe(true);
  });

  it("does not misidentify other errors", () => {
    expect(isMissingRelationError(new Error("network down"))).toBe(false);
  });
});
