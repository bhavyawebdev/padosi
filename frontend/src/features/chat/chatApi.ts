import { api } from "@/lib/api";
import type { ChatReply } from "@/types";

export async function askAssistant(message: string, lat?: number, lng?: number): Promise<ChatReply> {
  return api<ChatReply>("/chat", {
    method: "POST",
    body: { message, lat: lat ?? null, lng: lng ?? null },
  });
}
