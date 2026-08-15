import { api } from "@/lib/api";
import type { Conversation, ConversationDetail, MessageItem } from "@/types";

export async function fetchConversations(): Promise<Conversation[]> {
  return api<Conversation[]>("/messages/conversations");
}

export async function startConversation(userId: string): Promise<ConversationDetail> {
  return api<ConversationDetail>("/messages/conversations", {
    method: "POST",
    body: { user_id: userId },
  });
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail> {
  return api<ConversationDetail>(`/messages/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId: string, body: string): Promise<MessageItem> {
  return api<MessageItem>(`/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { body },
  });
}
