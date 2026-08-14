import { describe, it, expect } from "vitest";
import { ROLE_LEVEL, CAN } from "@/lib/auth/roles";

describe("Role hierarchy", () => {
  it("orders roles by privilege", () => {
    expect(ROLE_LEVEL.user).toBeLessThan(ROLE_LEVEL.moderator);
    expect(ROLE_LEVEL.moderator).toBeLessThan(ROLE_LEVEL.admin);
    expect(ROLE_LEVEL.admin).toBeLessThan(ROLE_LEVEL.super_admin);
  });

  it("permits moderation for moderators and above", () => {
    expect(CAN.moderate("user")).toBe(false);
    expect(CAN.moderate("moderator")).toBe(true);
    expect(CAN.moderate("admin")).toBe(true);
    expect(CAN.moderate("super_admin")).toBe(true);
    expect(CAN.moderate(null)).toBe(false);
  });

  it("permits admin actions only for admins and super admins", () => {
    expect(CAN.admin("user")).toBe(false);
    expect(CAN.admin("moderator")).toBe(false);
    expect(CAN.admin("admin")).toBe(true);
    expect(CAN.admin("super_admin")).toBe(true);
  });

  it("reserves super-admin actions", () => {
    expect(CAN.superAdmin("admin")).toBe(false);
    expect(CAN.superAdmin("super_admin")).toBe(true);
  });
});
