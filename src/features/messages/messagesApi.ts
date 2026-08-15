import { ApiError, toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { Conversation, ConversationDetail, MessageItem } from "@/types";

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.rpc("list_conversations");
  if (error) throw toApiError(error);
  return (data ?? []) as Conversation[];
}

export async function startConversation(userId: string): Promise<ConversationDetail> {
  const { data, error } = await supabase.rpc("start_conversation", {
    p_other_user_id: userId,
  });
  if (error) throw toApiError(error);
  return data as ConversationDetail;
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail> {
  const { data, error } = await supabase.rpc("get_conversation", {
    p_conversation_id: conversationId,
  });
  if (error) throw toApiError(error);
  return data as ConversationDetail;
}

export async function sendMessage(conversationId: string, body: string): Promise<MessageItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body })
    .select("id, conversation_id, sender_id, body, created_at, read_at, sender:profiles!messages_sender_id_fkey(full_name)")
    .single();
  if (error) throw toApiError(error);
  const row = data as unknown as {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
    sender: { full_name: string } | null;
  };
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_name: row.sender?.full_name ?? "",
    body: row.body,
    created_at: row.created_at,
    read_at: row.read_at,
  };
}
