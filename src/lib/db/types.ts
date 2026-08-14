// src/lib/db/types.ts

export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  neighbourhood: string;
  location_radius: number;
  neighbour_score: number;
  provider?: "email" | "google";
  /** Presence: updated on activity for online/last-seen display. */
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
};

export type NearbyPost = {
  id: string;
  user_id: string;
  content: string;
  category: string; // 'Alert' | 'Event' | 'Lost & Found' | 'Recommendation' | 'Other'
  images: string[];
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type HelpProfile = {
  id: string;
  user_id: string;
  category: string; // 'Plumbing' | 'Electrical' | 'Tuition' | 'Cooking' | 'Pet Care' | 'Other'
  description: string;
  is_verified: boolean;
  rating: number;
  created_at: string;
  updated_at: string;
};

export type HelpRequest = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string; // 'Tools' | 'Medical' | 'Food' | 'Errands' | 'Other'
  status: 'open' | 'resolved';
  expires_at: string;
  created_at: string;
  updated_at: string;
};

// ============================================================
// MESSAGING
// ============================================================

export type ConversationType = "direct" | "group";

export type MemberRole = "owner" | "admin" | "member";

export type Conversation = {
  id: string;
  type: ConversationType;
  /** Group display name. Null for direct conversations. */
  name: string | null;
  /** Group image URL. Null for direct conversations. */
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  /** Last activity (message sent / member changed) — used for sorting. */
  updated_at: string;
};

export type ConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  /** When set, the member has muted notifications for this conversation. */
  muted_until?: string | null;
  /** Read watermark for read receipts / unread counts. */
  last_read_at?: string | null;
  /** When set, the member archived this conversation (hidden from the list). */
  archived_at?: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  /** Id of the message this one replies to (threaded chat). */
  reply_to_message_id?: string | null;
  /** Set when the sender edits the message. */
  edited_at?: string | null;
  /** Set when the sender deletes the message (soft delete). */
  deleted_at?: string | null;
};

export type MessageRead = {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};

/** Conversation + everything the conversation list needs to render. */
export type ConversationSummary = {
  conversation: Conversation;
  /** Other participant's name (direct) or group name. */
  displayName: string;
  /** Other participant's avatar (direct) or group image. */
  avatarUrl: string | null;
  lastMessage: Message | null;
  lastSenderName: string | null;
  unreadCount: number;
  memberCount: number;
  /** True when the current user archived this conversation. */
  archived?: boolean;
};

// Joined types for UI
export type ConversationMemberWithUser = ConversationMember & { user: User };
export type MessageWithSender = Message & { sender: User };
export type MessageWithReply = MessageWithSender & { replyTo: MessageWithSender | null };

// ============================================================
// COMMENTS & REACTIONS
// ============================================================

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  /** Null for top-level comments; the id of the comment being replied to. */
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  /** Soft delete — the row stays so threads keep context. */
  deleted_at: string | null;
};

export type PostReaction = {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
};

export type PostCommentWithUser = PostComment & { user: User };

// ============================================================
// BLOCKS & REPORTS
// ============================================================

export type Block = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type ReportTargetType = "post" | "comment" | "user" | "message" | "group";

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export type AppNotification = {
  id: string;
  user_id: string;
  /** The user who triggered the notification (null for system events). */
  actor_id: string | null;
  type: string;
  content: string;
  related_link: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationWithActor = AppNotification & { actor: User | null };

// Joined types for UI
export type NearbyPostWithUser = NearbyPost & { user: User };
export type HelpProfileWithUser = HelpProfile & { user: User };
export type HelpRequestWithUser = HelpRequest & { user: User };
