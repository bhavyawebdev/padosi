"use client";

/**
 * src/features/messaging/hooks.ts — reactive messaging hooks
 *
 * All hooks subscribe to the app's real-time events via useDbSync, so the UI
 * updates instantly when messages arrive — same tab or another tab.
 */

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/db/local-db";
import { useDbSync } from "@/lib/db/use-db-sync";
import type {
  ConversationSummary,
  MessageWithReply,
  ConversationMemberWithUser,
} from "@/lib/db/types";

/** Aggregate unread counts for nav badges (messages + notifications). */
export function useUnreadCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  useDbSync(
    useCallback(async () => {
      if (!user) return;
      const [messages, notifications] = await Promise.all([
        db.getUnreadMessageCount(user.id),
        db.getUnreadNotificationCount(user.id),
      ]);
      setCounts({ messages, notifications });
    }, [user]),
    [user?.id]
  );

  return counts;
}

/** Conversation list for the current user, sorted by last activity. */
export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useDbSync(
    useCallback(async () => {
      if (!user) return;
      const data = await db.getConversationSummaries(user.id);
      setConversations(data);
      setLoading(false);
    }, [user]),
    [user?.id]
  );

  return { conversations, loading };
}

/** Everything the chat window needs for one conversation. */
export function useConversation(conversationId: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<{
    conversation: NonNullable<Awaited<ReturnType<typeof db.getConversation>>>;
    members: ConversationMemberWithUser[];
    messages: MessageWithReply[];
    myRole: "owner" | "admin" | "member" | null;
    muted: boolean;
    archived: boolean;
  } | null>(null);

  useDbSync(
    useCallback(async () => {
      if (!conversationId || !user) {
        setData(null);
        return;
      }
      const [conversation, members, messages, muted, archived] = await Promise.all([
        db.getConversation(conversationId),
        db.getConversationMembers(conversationId),
        db.getMessagesWithReplies(conversationId),
        db.isConversationMuted(conversationId, user.id),
        db.isConversationArchived(conversationId, user.id),
      ]);
      if (!conversation) {
        setData(null);
        return;
      }
      const myRole = members.find((m) => m.user_id === user.id)?.role ?? null;
      setData({ conversation, members, messages, myRole, muted, archived });
    }, [conversationId, user]),
    [conversationId, user?.id]
  );

  return data;
}
