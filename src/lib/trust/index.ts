import type { TrustLevel, TrustSignal } from "@/types/domain";

export interface TrustScore {
  level: TrustLevel;
  score: number;
  signals: TrustSignal[];
  label: string;
}

const LEVEL_THRESHOLDS: Record<TrustLevel, number> = {
  new:      0,
  basic:    10,
  trusted:  30,
  verified: 60,
};

export const SIGNAL_POINTS: Record<TrustSignal, number> = {
  email_verified:    10,
  account_age:       5,
  community_confirm: 8,
  neighbour_rec:     15,
  society_verified:  20,
  request_fulfilled: 8,
  admin_verified:    30,
};

export function computeTrustLevel(signals: TrustSignal[]): TrustScore {
  const score = signals.reduce((sum, s) => sum + (SIGNAL_POINTS[s] ?? 0), 0);

  let level: TrustLevel = "new";
  if (score >= LEVEL_THRESHOLDS.verified) level = "verified";
  else if (score >= LEVEL_THRESHOLDS.trusted)  level = "trusted";
  else if (score >= LEVEL_THRESHOLDS.basic)    level = "basic";

  return {
    level,
    score,
    signals,
    label: TRUST_LABELS[level],
  };
}

export const TRUST_LABELS: Record<TrustLevel, string> = {
  new:      "New Member",
  basic:    "Basic",
  trusted:  "Trusted",
  verified: "Verified",
};
