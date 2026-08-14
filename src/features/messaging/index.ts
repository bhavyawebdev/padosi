/**
 * src/features/messaging/index.ts — messaging feature domain
 *
 * Helpers shared across the messaging UI. Data access lives in the
 * LocalDatabase engine (src/lib/db/local-db.ts); this module only shapes
 * that data for the UI.
 */

import { db } from "@/lib/db/local-db";
import type { Conversation, ConversationSummary } from "@/lib/db/types";

/**
 * Open (or create) the direct conversation with another user and return its
 * id, so callers can navigate to /messages?c=<id>.
 */
export async function startDirectConversation(
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const conversation = await db.getOrCreateDirectConversation(userId, otherUserId);
  return conversation?.id ?? null;
}

/** Human-readable conversation title (other user for DMs, group name for groups). */
export function conversationTitle(summary: ConversationSummary): string {
  if (summary.conversation.type === "group") {
    return summary.displayName || "Community Group";
  }
  return summary.displayName || "Neighbour";
}

/** Avatar to show for a conversation. */
export function conversationAvatar(summary: ConversationSummary): string | null {
  return summary.avatarUrl;
}

/** The last message preview with the sender's name (for groups). */
export function lastMessagePreview(summary: ConversationSummary): string {
  if (!summary.lastMessage) return "No messages yet";
  const isGroup = summary.conversation.type === "group";
  const sender = summary.lastSenderName ? `${summary.lastSenderName}: ` : "";
  const prefix = isGroup ? sender : "";
  return `${prefix}${summary.lastMessage.content}`;
}

export type { Conversation, ConversationSummary };
