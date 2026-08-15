import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
