import { describe, it, expect } from "vitest";
import { computeTrustLevel, SIGNAL_POINTS } from "@/lib/trust";
import { expiryFromNow, isPostActive, expiryLabel } from "@/lib/expiry";
import { bucketDistance } from "@/lib/geo";

describe("Trust Engine", () => {
  it("assigns 'new' level to a user with no signals", () => {
    const result = computeTrustLevel([]);
    expect(result.level).toBe("new");
    expect(result.score).toBe(0);
  });

  it("assigns 'basic' level after email verification", () => {
    const result = computeTrustLevel(["email_verified"]);
    expect(result.level).toBe("basic");
    expect(result.score).toBe(SIGNAL_POINTS.email_verified);
  });

  it("assigns 'verified' level with enough signals", () => {
    // admin_verified(30) + neighbour_rec(15) + society_verified(20) = 65 ≥ 60
    const result = computeTrustLevel([
      "admin_verified",
      "neighbour_rec",
      "society_verified",
    ]);
    expect(result.level).toBe("verified");
  });

});

describe("Expiry Engine", () => {
  it("creates a future expiry timestamp", () => {
    const expiry = expiryFromNow(24);
    expect(new Date(expiry) > new Date()).toBe(true);
  });

  it("marks future expiry as active", () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    expect(isPostActive(future)).toBe(true);
  });

  it("marks past expiry as inactive", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isPostActive(past)).toBe(false);
  });

  it("returns 'Expired' for a past expiry", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(expiryLabel(past)).toBe("Expired");
  });
});

describe("Geo Engine", () => {
  it("buckets distances correctly", () => {
    expect(bucketDistance(100)).toBe("200m away");
    expect(bucketDistance(450)).toBe("400m away");
    expect(bucketDistance(900)).toBe("800m away");
    expect(bucketDistance(2000)).toBe("1.5km away");
    expect(bucketDistance(4000)).toBe("~5km away");
    expect(bucketDistance(10000)).toBe("Nearby");
  });
});
