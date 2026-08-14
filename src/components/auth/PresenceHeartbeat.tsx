"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { usePresence } from "@/lib/db/use-presence";

/** Keeps last_seen_at fresh while the user is in the app (renders nothing). */
export function PresenceHeartbeat() {
  const { user } = useAuth();
  usePresence(user?.id);
  return null;
}
