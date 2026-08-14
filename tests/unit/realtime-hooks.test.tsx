import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRealtimeMessages, useRealtimePresence } from "@/lib/realtime/hooks";

vi.mock("@/lib/supabase/client", () => {
  return {
    createClient: () => null, // Supabase not configured → hooks must no-op safely
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRealtimeMessages", () => {
  it("stays idle (no-op) when Supabase is not configured", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useRealtimeMessages("conv-1", onEvent));
    expect(result.current.status).toBe("idle");
  });

  it("stays idle when no conversation id is provided", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useRealtimeMessages(null, onEvent));
    expect(result.current.status).toBe("idle");
  });
});

describe("useRealtimePresence", () => {
  it("no-ops without a channel name", () => {
    const { result } = renderHook(() => useRealtimePresence(null, { user_id: "u1" }, vi.fn()));
    expect(result.current).toBeUndefined();
  });

  it("no-ops without presence state", () => {
    const { result } = renderHook(() => useRealtimePresence("presence:x", null, vi.fn()));
    expect(result.current).toBeUndefined();
  });
});
