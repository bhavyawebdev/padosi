/**
 * src/lib/data/production.ts — production Supabase data layer
 *
 * Typed, RLS-respecting functions for the production tables. The browser
 * client (anon key) is used throughout — authorization is enforced by the
 * database, never by this module. Errors are mapped to safe, friendly values.
 *
 * These functions mirror the LocalDatabase API (src/lib/db/local-db.ts) so a
 * feature can switch sources without changing its UI. Until the production
 * migration is applied to the hosted project, callers should treat a
 * "relation does not exist" error as the signal to keep using local-db.
 */

import { createClient } from "@/lib/supabase/client";
import { toFriendlyError, isMissingRelationError, type FriendlyError } from "@/lib/supabase/errors";

export type DataResult<T> = { data: T; error: null } | { data: null; error: FriendlyError };

/** True when the production schema isn't available yet (migration not applied). */
export function isProductionUnavailable(err: unknown): boolean {
  return isMissingRelationError(err);
}

async function run<T>(fn: () => Promise<{ data: T | null; error: unknown }>): Promise<DataResult<T>> {
  try {
    const { data, error } = await fn();
    if (error) return { data: null, error: toFriendlyError(error) };
    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: toFriendlyError(err) };
  }
}

// ============================================================
// PROFILES
// ============================================================

export type PublicProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  neighbourhood: string | null;
  city: string | null;
  neighbour_score: number | null;
  created_at: string;
};

export async function getPublicProfile(userId: string): Promise<DataResult<PublicProfile>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    // Read through the column-safe public view — never the raw profiles table,
    // which carries email and last_seen_at.
    const res = await supabase
      .from("profiles_public")
      .select(
        "id, full_name, username, avatar_url, bio, neighbourhood, city, neighbour_score, created_at"
      )
      .eq("id", userId)
      .single();
    return { data: res.data as PublicProfile | null, error: res.error };
  });
}

export type ProfileUpdate = {
  full_name?: string;
  username?: string;
  bio?: string;
  neighbourhood?: string;
  city?: string;
  avatar_url?: string;
  visibility?: "public" | "neighbours" | "private";
};

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase.from("profiles").update(updates).eq("id", userId);
    return { data: null, error: res.error };
  });
}

// ============================================================
// POSTS
// ============================================================

export type Post = {
  id: string;
  author_id: string;
  module: "nearby" | "help" | "need";
  title: string | null;
  content: string;
  category: string | null;
  status: string;
  created_at: string;
};

export async function getPosts(options: { before?: string; limit?: number } = {}): Promise<DataResult<Post[]>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    let query = supabase
      .from("posts")
      .select("id, author_id, module, title, content, category, status, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(Math.min(options.limit ?? 20, 50));
    if (options.before) query = query.lt("created_at", options.before);
    const res = await query;
    return { data: res.data as Post[] | null, error: res.error };
  });
}

export async function createPost(input: {
  module: "nearby" | "help" | "need";
  title?: string;
  content: string;
  category?: string;
}): Promise<DataResult<Post>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("posts")
      .insert({ module: input.module, title: input.title, content: input.content, category: input.category })
      .select()
      .single();
    return { data: res.data as Post | null, error: res.error };
  });
}

// ============================================================
// COMMENTS
// ============================================================

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
};

export async function getComments(
  postId: string,
  options: { before?: string; limit?: number } = {}
): Promise<DataResult<Comment[]>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    let query = supabase
      .from("post_comments")
      .select("id, post_id, author_id, parent_comment_id, content, created_at")
      .eq("post_id", postId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(options.limit ?? 30, 100));
    if (options.before) query = query.lt("created_at", options.before);
    const res = await query;
    return { data: res.data as Comment[] | null, error: res.error };
  });
}

export async function createComment(input: {
  postId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<DataResult<Comment>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("post_comments")
      .insert({
        post_id: input.postId,
        content: input.content,
        parent_comment_id: input.parentCommentId ?? null,
      })
      .select()
      .single();
    return { data: res.data as Comment | null, error: res.error };
  });
}

// ============================================================
// COMMENTS (edit / delete) & REACTIONS
// ============================================================

export async function updateComment(
  commentId: string,
  content: string
): Promise<DataResult<Comment>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("post_comments")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .select()
      .single();
    return { data: res.data as Comment | null, error: res.error };
  });
}

export async function deleteComment(commentId: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("post_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    return { data: null, error: res.error };
  });
}

export type ReactionResult = { reacted: boolean; count: number };

export async function toggleReaction(
  postId: string,
  reactionType = "like"
): Promise<DataResult<ReactionResult>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("not authenticated") };

    // Find the user's existing reaction.
    const { data: existing } = await supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("post_reactions").delete().eq("id", existing.id);
      if (error) return { data: null, error: toFriendlyError(error) };
    } else {
      const { error } = await supabase
        .from("post_reactions")
        .insert({ post_id: postId, user_id: user.id, reaction_type: reactionType });
      if (error) return { data: null, error: toFriendlyError(error) };
    }

    const { count, error: countError } = await supabase
      .from("post_reactions")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    if (countError) return { data: null, error: toFriendlyError(countError) };

    return { data: { reacted: !existing, count: count ?? 0 }, error: null };
  });
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string | null;
  content: string;
  related_link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotificationsForUser(
  userId: string,
  options: { before?: string; limit?: number } = {}
): Promise<DataResult<NotificationRow[]>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    let query = supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, title, content, related_link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(options.limit ?? 30, 100));
    if (options.before) query = query.lt("created_at", options.before);
    const res = await query;
    return { data: res.data as NotificationRow[] | null, error: res.error };
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<DataResult<number>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return { data: res.count ?? 0, error: res.error };
  });
}

export async function markNotificationRead(id: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    return { data: null, error: res.error };
  });
}

export async function markAllNotificationsRead(userId: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    return { data: null, error: res.error };
  });
}

// ============================================================
// CONVERSATIONS & MESSAGES
// ============================================================

export type ConversationRow = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export async function getConversationsForUser(userId: string): Promise<DataResult<ConversationRow[]>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    // Conversations where the user is a member, via the members join table.
    const res = await supabase
      .from("conversations")
      .select(
        "id, type, name, avatar_url, created_by, created_at, updated_at, conversation_members!inner(user_id)"
      )
      .eq("conversation_members.user_id", userId)
      .order("updated_at", { ascending: false });
    const rows = (res.data ?? []) as (ConversationRow & { conversation_members: { user_id: string }[] })[];
    return {
      data: rows.map(({ conversation_members: _cm, ...rest }) => rest),
      error: res.error,
    };
  });
}

export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string
): Promise<DataResult<ConversationRow>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };

    // Try to find an existing 2-member direct conversation.
    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select(
        "id, type, name, avatar_url, created_by, created_at, updated_at, conversation_members!inner(user_id)"
      )
      .eq("type", "direct")
      .eq("conversation_members.user_id", userId)
      .limit(50);
    if (findError) return { data: null, error: toFriendlyError(findError) };

    const rows = (existing ?? []) as (ConversationRow & {
      conversation_members: { user_id: string }[];
    })[];
    const match = rows.find(
      (c) =>
        c.conversation_members.length === 2 &&
        c.conversation_members.some((m) => m.user_id === otherUserId)
    );
    if (match) {
      const { conversation_members: _cm, ...rest } = match;
      return { data: rest, error: null };
    }

    // Create the conversation + both memberships.
    const { data: conversation, error: createError } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: userId })
      .select("id, type, name, avatar_url, created_by, created_at, updated_at")
      .single();
    if (createError) return { data: null, error: toFriendlyError(createError) };

    const { error: membersError } = await supabase.from("conversation_members").insert([
      { conversation_id: conversation.id, user_id: userId, role: "owner" },
      { conversation_id: conversation.id, user_id: otherUserId, role: "member" },
    ]);
    if (membersError) return { data: null, error: toFriendlyError(membersError) };

    return { data: conversation as ConversationRow, error: null };
  });
}

export async function getMessages(
  conversationId: string,
  options: { before?: string; limit?: number } = {}
): Promise<DataResult<MessageRow[]>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, message_type, created_at, edited_at, deleted_at")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(options.limit ?? 50, 200));
    if (options.before) query = query.lt("created_at", options.before);
    const res = await query;
    return { data: (res.data as MessageRow[] | null)?.reverse() ?? null, error: res.error };
  });
}

export async function sendMessage(
  conversationId: string,
  content: string,
  replyToMessageId?: string | null
): Promise<DataResult<MessageRow>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content,
        reply_to_message_id: replyToMessageId ?? null,
      })
      .select()
      .single();
    return { data: res.data as MessageRow | null, error: res.error };
  });
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<DataResult<MessageRow>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .select()
      .single();
    return { data: res.data as MessageRow | null, error: res.error };
  });
}

export async function deleteMessage(messageId: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);
    return { data: null, error: res.error };
  });
}

export async function muteConversation(
  conversationId: string,
  mutedUntil: string
): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("not authenticated") };
    const res = await supabase
      .from("conversation_members")
      .update({ muted_until: mutedUntil })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    return { data: null, error: res.error };
  });
}

export async function markConversationRead(conversationId: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("not authenticated") };
    const res = await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    return { data: null, error: res.error };
  });
}

// ============================================================
// REPORTS & BLOCKS
// ============================================================

export type ReportTargetType = "post" | "comment" | "user" | "message" | "group";

export async function createReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}): Promise<DataResult<{ id: string }>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase
      .from("reports")
      .insert({
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        description: input.description ?? null,
      })
      .select("id")
      .single();
    return { data: res.data as { id: string } | null, error: res.error };
  });
}

export async function blockUser(userId: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase.from("blocks").insert({ blocked_id: userId });
    return { data: null, error: res.error };
  });
}

export async function unblockUser(userId: string): Promise<DataResult<null>> {
  return run(async () => {
    const supabase = createClient();
    if (!supabase) return { data: null, error: new Error("not configured") };
    const res = await supabase.from("blocks").delete().eq("blocked_id", userId);
    return { data: null, error: res.error };
  });
}
