import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import {
  useConversation,
  useConversations,
  useSendMessage,
  useStartConversation,
} from "@/features/messages/messagesHooks";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/geo";

/**
 * Neighbour inbox — user-to-user DMs.
 *
 * Supports `?user=<id>` to open (or start) a conversation with a specific
 * neighbour — this is what the "Message" buttons on posts/requests use.
 * On desktop the list and thread sit side by side; on mobile they swap.
 */
export function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const inbox = useConversations();
  const start = useStartConversation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resolvingUser, setResolvingUser] = useState<string | null>(null);

  // ?user=<id> → resolve (or create) that conversation, then clear the param.
  useEffect(() => {
    const otherId = searchParams.get("user");
    if (!otherId || !user || resolvingUser === otherId) return;
    setResolvingUser(otherId);
    start.mutate(otherId, {
      onSuccess: (detail) => {
        setActiveId(detail.id);
        setSearchParams({}, { replace: true });
        setResolvingUser(null);
      },
      // Clear the param on failure too — otherwise the effect re-fires and
      // retries the mutation forever (e.g. a 404 on a deleted user).
      onError: () => {
        setResolvingUser(null);
        setSearchParams({}, { replace: true });
      },
    });
  }, [searchParams, user, start, resolvingUser, setSearchParams]);

  if (!user) return null;

  if (inbox.isError) {
    return <ErrorState message={inbox.error?.message ?? "Couldn't load your messages."} onRetry={() => inbox.refetch()} />;
  }

  const activeConv = activeId ? inbox.data?.find((c) => c.id === activeId) : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-headline-lg font-headline-lg text-on-background">Messages</h1>
        <p className="text-body-md font-body-md text-on-surface-variant mt-1">
          Private chats with your neighbours.
        </p>
      </header>

      {inbox.isLoading ? (
        <LoadingState label="Loading your chats…" />
      ) : inbox.data && inbox.data.length === 0 ? (
        <EmptyState
          icon="forum"
          title="No conversations yet"
          message="Open any post or request and hit Message to start a chat with a neighbour."
          action={
            <Link
              to="/nearby"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                explore
              </span>
              Browse Nearby
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Inbox list */}
          <aside className="lg:col-span-4 w-full bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden lg:sticky lg:top-[84px]">
            <ul className="divide-y divide-outline-variant/40 max-h-[60vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
              {inbox.data?.map((conv) => {
                const isActive = conv.id === activeId;
                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => setActiveId(conv.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-container",
                        isActive && "bg-primary-container/25",
                      )}
                    >
                      <Avatar name={conv.other_name} size="md" className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-label-md font-label-md text-on-background truncate">
                            {conv.other_name}
                          </span>
                          <span className="text-label-sm font-label-sm text-on-surface-variant shrink-0">
                            {timeAgo(conv.last_message_at)}
                          </span>
                        </span>
                        <span className="flex items-center justify-between gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-body-md font-body-md truncate",
                              conv.unread_count > 0 ? "text-on-background font-bold" : "text-on-surface-variant",
                            )}
                          >
                            {conv.last_message || "Say hello…"}
                          </span>
                          {conv.unread_count > 0 && (
                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-label-sm font-label-sm flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Thread */}
          <section className="lg:col-span-8 w-full">
            {activeConv ? (
              <Thread key={activeConv.id} conversationId={activeConv.id} otherName={activeConv.other_name} />
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center gap-3 py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
                  <span aria-hidden className="material-symbols-outlined text-[32px]">
                    chat_bubble
                  </span>
                </div>
                <h3 className="text-headline-md font-headline-md text-on-background">Pick a conversation</h3>
                <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
                  Choose a chat on the left, or start a new one from any post or request.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      <button
        onClick={() => navigate("/nearby")}
        className="lg:hidden inline-flex items-center gap-1.5 text-label-md font-label-md text-primary hover:underline"
      >
        <span aria-hidden className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        Back to Nearby
      </button>
    </div>
  );
}

function Thread({ conversationId, otherName }: { conversationId: string; otherName: string }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const conv = useConversation(conversationId);
  const send = useSendMessage(conversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv.data?.messages.length]);

  const submit = async () => {
    if (draft.trim().length === 0 || send.isPending) return;
    await send.mutateAsync(draft.trim());
    setDraft("");
  };

  if (conv.isLoading) return <LoadingState label="Opening chat…" />;
  if (conv.isError || !conv.data) {
    return <ErrorState message={conv.error?.message ?? "Couldn't load this chat."} onRetry={() => conv.refetch()} />;
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col h-[60vh] lg:h-[calc(100vh-200px)]">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/40">
        <Avatar name={otherName} size="sm" />
        <div className="min-w-0">
          <h2 className="text-label-md font-label-md text-on-background truncate">{otherName}</h2>
          <p className="text-label-sm font-label-sm text-on-surface-variant">Neighbour in your area</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-surface-container-low/40">
        {conv.data.messages.length === 0 ? (
          <p className="text-center text-label-sm font-label-sm text-on-surface-variant py-8">
            Say hello — this is the start of your conversation.
          </p>
        ) : (
          conv.data.messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm border",
                    mine
                      ? "bg-primary text-on-primary rounded-br-md border-primary"
                      : "bg-surface-container rounded-bl-md border-surface-variant",
                  )}
                >
                  <p className="text-body-md font-body-md whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "text-label-sm font-label-sm mt-1",
                      mine ? "text-on-primary/70" : "text-on-surface-variant",
                    )}
                  >
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="p-3 border-t border-outline-variant/40 bg-surface-container-low flex items-end gap-2">
        <textarea
          aria-label="Type a message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Type a message…"
          className="flex-1 resize-none bg-surface rounded-xl border border-outline-variant px-4 py-2.5 font-body-md text-body-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
        />
        <button
          onClick={() => void submit()}
          disabled={draft.trim().length === 0 || send.isPending}
          aria-label="Send message"
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            send
          </span>
        </button>
      </footer>
    </div>
  );
}
