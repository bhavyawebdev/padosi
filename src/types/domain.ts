/**
 * domain.ts
 *
 * Application-level domain types for Aas-Paas.
 */

// ============================================================
// MODULE SYSTEM
// ============================================================

export type Module = "nearby" | "help" | "need";

export interface ModuleConfig {
  id: Module;
  label: string;
  labelHi?: string;
  description: string;
  color: string;
  icon: string;
}

// ============================================================
// USER / PROFILE
// ============================================================

export interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  societyName?: string | null;
  trustScore: number;
  isEmailVerified: boolean;
  isVerified: boolean;
  location: GeoPoint | null;
  locality: string | null;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GEOLOCATION
// ============================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Locality {
  name: string;
  city: string;
  state: string;
  postalCode?: string;
  geoPoint: GeoPoint;
}

// ============================================================
// POSTS (Nearby / Help / Need)
// ============================================================

export type PostStatus = "active" | "expired" | "fulfilled" | "removed";

export interface BasePost {
  id: string;
  module: Module;
  authorId: string;
  author?: UserProfile;
  title: string;
  body: string;
  location: GeoPoint;
  locality: string;
  distanceMeters?: number;
  expiresAt: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

export type NearbyPost = BasePost & {
  module: "nearby";
  category?: string;
};

export type HelpPost = BasePost & {
  module: "help";
  isVerified: boolean;
  verificationNote?: string;
};

export type NeedPost = BasePost & {
  module: "need";
  isUrgent: boolean;
  fulfilledBy?: string;
};

export type Post = NearbyPost | HelpPost | NeedPost;

// ============================================================
// TRUST & VERIFICATION
// ============================================================

export type TrustLevel = "new" | "basic" | "trusted" | "verified";

export type TrustSignal =
  | "email_verified"
  | "account_age"
  | "community_confirm"
  | "neighbour_rec"
  | "society_verified"
  | "request_fulfilled"
  | "admin_verified";

export interface TrustInfo {
  level: TrustLevel;
  score: number;
  label: string;
  signals: TrustSignal[];
  isVerified: boolean;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType =
  | "post_nearby"
  | "post_help"
  | "post_need"
  | "reply"
  | "comment"
  | "reaction"
  | "message"
  | "mention"
  | "group_invite"
  | "group"
  | "trust_update"
  | "moderation"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// AUTH
// ============================================================

export type AuthStep =
  | "sign_in"
  | "sign_up"
  | "verify_email"
  | "onboarding"
  | "complete";

export interface AuthState {
  step: AuthStep;
  email?: string;
  isLoading: boolean;
  error?: string;
}
