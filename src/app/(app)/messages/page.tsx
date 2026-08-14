"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, PenSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { ChatWindow } from "@/features/messaging/components/ChatWindow";
import { NewMessageDrawer } from "@/features/messaging/components/NewMessageDrawer";
import { NewGroupDrawer } from "@/features/messaging/components/NewGroupDrawer";
import { useConversations } from "@/features/messaging/hooks";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("c");
  const { conversations, loading } = useConversations();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  const openConversation = (id: string) => {
    router.push(`/messages?c=${id}`, { scroll: false });
  };

  const closeConversation = () => {
    router.push("/messages", { scroll: false });
  };

  const chatOpenOnMobile = Boolean(conversationId);

  return (
    <div className="space-y-5">
      {/* Page header — hidden on mobile while a chat is open for an immersive screen */}
      <header
        className={cn(
          "p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow flex items-center justify-between",
          chatOpenOnMobile && "hidden md:block"
        )}
      >
        <div>
          <h1 className="headline-lg text-primary font-extrabold tracking-tight">Messages</h1>
          <p className="body-md text-on-surface-variant mt-1">
            Private chats and community groups with your neighbours.
          </p>
        </div>
        <div className="hidden md:flex w-14 h-14 rounded-2xl bg-secondary-container/30 text-secondary items-center justify-center">
          <MessageSquare size={28} />
        </div>
      </header>

      {/* Quick actions */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          chatOpenOnMobile && "hidden md:flex"
        )}
      >
        <Button
          variant="outline"
          size="md"
          className="hover-lift"
          leftIcon={<PenSquare size={16} />}
          onClick={() => setNewMessageOpen(true)}
        >
          New Message
        </Button>
        <Button
          variant="primary"
          size="md"
          className="hover-lift"
          leftIcon={<Users size={16} />}
          onClick={() => setNewGroupOpen(true)}
        >
          New Group
        </Button>
      </div>

      {/* Two-pane messaging card */}
      <div
        className={cn(
          "rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow overflow-hidden flex",
          chatOpenOnMobile
            ? "h-[calc(100dvh-132px)] md:h-[calc(100vh-300px)]"
            : "h-[calc(100dvh-308px)] min-h-72 md:h-[calc(100vh-300px)]"
        )}
      >
        {/* Conversation list */}
        <aside
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-outline-variant/20 flex flex-col overflow-y-auto scrollbar-hide",
            chatOpenOnMobile && "hidden md:flex"
          )}
        >
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            onSelect={openConversation}
            onNewMessage={() => setNewMessageOpen(true)}
            loading={loading}
          />
        </aside>

        {/* Active conversation */}
        <section
          className={cn(
            "flex-1 min-w-0 flex flex-col",
            !chatOpenOnMobile && "hidden md:flex"
          )}
          aria-label={conversationId ? "Active conversation" : "Messages"}
        >
          {conversationId ? (
            <ChatWindow conversationId={conversationId} onBack={closeConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 bg-surface">
              <EmptyState
                icon={<MessageSquare size={28} />}
                title="Select a conversation"
                description="Choose a chat from the list, or start a new message or group."
                actionLabel="New Message"
                onAction={() => setNewMessageOpen(true)}
              />
            </div>
          )}
        </section>
      </div>

      <NewMessageDrawer
        isOpen={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onStart={openConversation}
      />
      <NewGroupDrawer
        isOpen={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onStart={openConversation}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
