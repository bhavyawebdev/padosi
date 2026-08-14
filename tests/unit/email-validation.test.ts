import { describe, it, expect, afterEach } from "vitest";
import { validateEmail, DISPOSABLE_DOMAINS } from "@/lib/email-validation";

afterEach(() => {
  delete process.env.EMAIL_VALIDATION_API_URL;
  delete process.env.EMAIL_VALIDATION_API_KEY;
  delete process.env.EMAIL_VALIDATION_FAIL_OPEN;
});

describe("Email validation", () => {
  it("accepts a normal email", async () => {
    const res = await validateEmail("Priya.Sharma@Gmail.com");
    expect(res.valid).toBe(true);
    expect(res.normalizedEmail).toBe("priya.sharma@gmail.com");
  });

  it("rejects malformed emails", async () => {
    expect((await validateEmail("not-an-email")).valid).toBe(false);
    expect((await validateEmail("a@b")).valid).toBe(false);
    expect((await validateEmail("user@")).valid).toBe(false);
    expect((await validateEmail("user..name@gmail.com")).valid).toBe(false);
  });

  it("rejects disposable / temporary email domains", async () => {
    expect(DISPOSABLE_DOMAINS.has("mailinator.com")).toBe(true);
    const res = await validateEmail("temp@10minutemail.com");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("disposable");
  });

  it("fails open when the provider is unreachable", async () => {
    process.env.EMAIL_VALIDATION_API_URL = "http://127.0.0.1:9/validate";
    process.env.EMAIL_VALIDATION_API_KEY = "test-key";
    // Default policy: fail-open on provider outage → still valid.
    const res = await validateEmail("someone@example.com");
    expect(res.valid).toBe(true);
  });

  it("fails closed when EMAIL_VALIDATION_FAIL_OPEN=false", async () => {
    process.env.EMAIL_VALIDATION_API_URL = "http://127.0.0.1:9/validate";
    process.env.EMAIL_VALIDATION_API_KEY = "test-key";
    process.env.EMAIL_VALIDATION_FAIL_OPEN = "false";
    const res = await validateEmail("someone@example.com");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("provider-rejected");
  });

  it("skips the provider entirely when it is not configured", async () => {
    const res = await validateEmail("ok@example.com");
    expect(res.valid).toBe(true);
  });
});
