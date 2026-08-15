/** Shared API types — mirror the backend Pydantic schemas (docs/API_CONTRACTS.md). */

export type UserRole = "individual" | "business" | "community" | "admin";

export interface Locality {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  govt_id_verified: boolean;
  role: UserRole;
  about: string | null;
  locality: Locality | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
  /** Identifies this login in the "recent sign-ins" audit list. */
  session_id: string | null;
}

export interface LoginSession {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  locality_id: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type FeedCategory = "traffic" | "civic" | "safety" | "utility" | "event" | "other";

export interface FeedPost {
  id: string;
  user_id: string;
  author_name: string;
  author_role: UserRole | null;
  category: FeedCategory;
  text: string;
  distance_m: number | null;
  created_at: string;
  expires_at: string;
  confirm_count: number;
  confirmed_by_me: boolean;
  resolved: boolean;
  urgent: boolean;
}

export interface CreatePostPayload {
  category: FeedCategory;
  text: string;
  lat: number;
  lng: number;
  urgent?: boolean;
}

export type ProviderCategory =
  | "cook"
  | "maid"
  | "tutor"
  | "plumber"
  | "electrician"
  | "dog_walker"
  | "other";

export interface ProviderProfile {
  id: string;
  user_id: string;
  display_name: string;
  category: ProviderCategory;
  tagline: string;
  price_range: string | null;
  availability: string | null;
  service_area_km: number;
  verified: boolean;
  verification_count: number;
  review_count: number;
  avg_rating: number;
  distance_m: number | null;
}

export interface Review {
  id: string;
  provider_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface CreateReviewPayload {
  rating: number;
  text: string;
}

export interface ProviderDetail extends ProviderProfile {
  reviews: Review[];
}

export interface ProviderCreatePayload {
  category: ProviderCategory;
  tagline: string;
  price_range?: string | null;
  availability?: string | null;
  service_area_km: number;
  lat: number;
  lng: number;
}

export type RequestType = "borrow_lend" | "ride_share" | "spare_item" | "other";
export type RequestStatus = "open" | "fulfilled" | "expired";

export interface LocalRequest {
  id: string;
  user_id: string;
  author_name: string;
  type: RequestType;
  text: string;
  distance_m: number | null;
  needed_by: string;
  status: RequestStatus;
  reply_count: number;
  created_at: string;
}

export interface RequestReply {
  id: string;
  request_id: string;
  user_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

export interface RequestDetail extends LocalRequest {
  replies: RequestReply[];
}

export interface CreateRequestPayload {
  type: RequestType;
  text: string;
  lat: number;
  lng: number;
  needed_by: string; // ISO datetime
}

export interface ReportPayload {
  reason: string;
}

export type NotificationType = "reply" | "confirm" | "review";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  created_at: string;
  target_type: "request" | "post" | "provider";
  target_id: string;
}

/* ---- Admin API (platform super-admin + community dashboards) ---- */

export interface AdminOverviewCounts {
  users: number;
  businesses: number;
  communities: number;
  feed_posts: number;
  active_posts: number;
  open_requests: number;
  providers: number;
  verified_providers: number;
  reviews: number;
  reports: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface AdminOverview {
  counts: AdminOverviewCounts;
  posts_by_category: CategoryCount[];
  signups_last_7_days: { date: string; count: number }[];
  recent_reports: AdminReport[];
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  phone_verified: boolean;
  govt_id_verified: boolean;
  locality_name: string | null;
  created_at: string;
}

export interface AdminUserUpdate {
  role?: UserRole;
  phone_verified?: boolean;
  govt_id_verified?: boolean;
}

export interface AdminPost {
  id: string;
  author_name: string;
  author_role: UserRole;
  category: string;
  text: string;
  confirm_count: number;
  resolved: boolean;
  urgent: boolean;
  created_at: string;
  expires_at: string;
}

export interface AdminRequest {
  id: string;
  author_name: string;
  type: string;
  text: string;
  status: string;
  reply_count: number;
  needed_by: string;
  created_at: string;
}

export interface AdminProvider {
  id: string;
  display_name: string;
  category: string;
  tagline: string;
  verified: boolean;
  verification_count: number;
  review_count: number;
  avg_rating: number;
  created_at: string;
}

export interface AdminReport {
  id: string;
  reporter_name: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
}

export interface CommunityOverview {
  locality_name: string;
  post_count: number;
  active_post_count: number;
  request_count: number;
  provider_count: number;
  posts_by_category: CategoryCount[];
  recent_posts: AdminPost[];
}

/* ---- Direct messages (user-to-user chat) ---- */

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Conversation {
  id: string;
  other_user_id: string;
  other_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface ConversationDetail {
  id: string;
  other_user_id: string;
  other_name: string;
  messages: MessageItem[];
}

/* ---- Service booking / contact requests ---- */

export type BookingStatus = "new" | "accepted" | "declined";
export type BookingDirection = "incoming" | "outgoing";

export interface Booking {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_category: ProviderCategory;
  customer_id: string;
  customer_name: string;
  message: string;
  status: BookingStatus;
  reply: string | null;
  direction: BookingDirection;
  created_at: string;
}

/* ---- AI assistant ---- */

export interface ChatReply {
  reply: string;
  suggestions: string[];
}
