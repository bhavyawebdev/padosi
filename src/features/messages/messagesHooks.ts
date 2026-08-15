import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import type { ConversationDetail } from "@/types";

import {
  fetchConversation,
  fetchConversations,
  sendMessage,
  startConversation,
} from "./messagesApi";

/** Inbox list — refreshed every 10s so new messages appear without a reload. */
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: 10_000,
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => fetchConversation(conversationId as string),
    enabled: !!conversationId,
    refetchInterval: 10_000,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startConversation,
    onSuccess: (detail) => {
      queryClient.setQueryData(["conversation", detail.id], detail);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Live message delivery for an open thread via Supabase Realtime. RLS scopes
 * the stream to conversation participants; the query is invalidated so the
 * authoritative rows (including read marks) are refetched.
 */
export function useMessageSubscription(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(conversationId as string, body),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData<ConversationDetail>(["conversation", conversationId], (old) =>
        old ? { ...old, messages: [...old.messages, message] } : old,
      );
    },
  });
}
