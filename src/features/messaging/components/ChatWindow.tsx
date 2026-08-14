"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Users, Info, Bell, BellOff, X, CornerDownRight, CheckCircle2, Flag, Archive, ArchiveRestore } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";
import { MessageBubble } from "./MessageBubble";
import { GroupInfoDrawer } from "./GroupInfoDrawer";
import { useConversation } from "../hooks";
import { useBroadcastTyping, useTypingUsers } from "../use-typing";
import { conversationTitle } from "../index";
import type { MessageWithReply } from "@/lib/db/types";

interface ChatWindowProps {
  conversationId: string;
  onBack: () => void;
}

const isSameDay = (a: string, b: string) =>
  format(new Date(a), "yyyy-MM-dd") === format(new Date(b), "yyyy-MM-dd");

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="label-sm font-semibold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const data = useConversation(conversationId);
  const [draft, setDraft] = useState("");
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageWithReply | null>(null);
  const [editing, setEditing] = useState<MessageWithReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [reportTarget, setReportTarget] = useState<MessageWithReply | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [archivedBusy, setArchivedBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);

  const messages = data?.messages ?? [];
  const members = data?.members ?? [];
  const isGroup = data?.conversation.type === "group";
  const muted = data?.muted ?? false;
  // Derived from the hook's data (refreshed on every db write via useDbSync),
  // so opening an already-archived chat or switching conversations always
  // shows the correct toggle state.
  const archived = data?.archived ?? false;

  // Typing indicator: broadcast our keystrokes; show others' names.
  const broadcastTyping = useBroadcastTyping(conversationId, user?.id, user?.full_name ?? "");
  const typingUsers = useTypingUsers(conversationId, user?.id);

  const otherMember = members.find((m) => m.user_id !== user?.id);
  const otherMemberUser = otherMember?.user;

  // Presence: online when last_seen within the last 2 minutes. Kept in state
  // and refreshed by a timer so no impure clock reads happen during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const isOnline = Boolean(
    otherMemberUser?.last_seen_at &&
      now - new Date(otherMemberUser.last_seen_at).getTime() < 2 * 60 * 1000
  );
  const lastSeenLabel = otherMemberUser?.last_seen_at
    ? `Last seen ${formatDistanceToNow(new Date(otherMemberUser.last_seen_at), { addSuffix: true })}`
    : null;

  // Mark the conversation as read whenever it is open and has unread messages
  // (regardless of who sent the last one).
  useEffect(() => {
    if (!user || !data) return;
    let cancelled = false;
    void db.getUnreadCountByConversation(conversationId, user.id).then((count) => {
      if (!cancelled && count > 0) void db.markConversationRead(conversationId, user.id);
    });
    return () => {
      cancelled = true;
    };
  }, [user, data, conversationId]);

  // Keep the latest message in view — but respect the user scrolling up to
  // read history; new messages only auto-scroll when already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Jump to the bottom when switching to a conversation.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    nearBottomRef.current = true;
  }, [conversationId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !draft.trim() || busy) return;
    setBusy(true);
    let ok = false;
    try {
      if (editing) {
        ok = (await db.editMessage(editing.id, user.id, draft)) !== null;
      } else {
        ok = (await db.sendMessage(conversationId, user.id, draft, replyTo?.id ?? null)) !== null;
      }
    } finally {
      if (ok) {
        setDraft("");
        setReplyTo(null);
        setEditing(null);
      }
      setBusy(false);
      const el = composerRef.current;
      if (el) el.style.height = "auto";
    }
  };

  const handleEditMessage = (message: MessageWithReply) => {
    setEditing(message);
    setReplyTo(null);
    setDraft(message.content);
    composerRef.current?.focus();
  };

  const handleDeleteMessage = async (message: MessageWithReply) => {
    if (!user) return;
    await db.deleteMessage(message.id, user.id);
    if (editing?.id === message.id) {
      setEditing(null);
      setDraft("");
    }
  };

  const toggleMute = async () => {
    if (!user) return;
    if (muted) {
      await db.unmuteConversation(conversationId, user.id);
    } else {
      await db.muteConversation(conversationId, user.id);
    }
  };

  const toggleArchive = async () => {
    if (!user || archivedBusy) return;
    const wasArchived = archived;
    setArchivedBusy(true);
    try {
      if (wasArchived) {
        await db.unarchiveConversation(conversationId, user.id);
      } else {
        await db.archiveConversation(conversationId, user.id);
      }
      if (!wasArchived) onBack(); // archiving leaves the chat back to the list
    } finally {
      setArchivedBusy(false);
    }
  };

  const submitReport = async () => {
    if (!user || !reportTarget || !reportReason.trim() || reportBusy) return;
    setReportBusy(true);
    await db.createReport({
      reporterId: user.id,
      targetType: "message",
      targetId: reportTarget.id,
      reason: reportReason,
      description: reportTarget.content,
    });
    setReportBusy(false);
    setReportSent(true);
  };

  if (!data) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={`h-14 w-2/3 ${i % 2 ? "ml-auto" : ""}`} />
          ))}
        </div>
      </div>
    );
  }

  const title = conversationTitle({
    conversation: data.conversation,
    displayName: data.conversation.name || otherMember?.user.full_name || "Neighbour",
    avatarUrl: isGroup ? data.conversation.avatar_url : otherMember?.user.avatar_url || null,
    lastMessage: null,
    lastSenderName: null,
    unreadCount: 0,
    memberCount: members.length,
  });

  const typingLabel =
    typingUsers.length > 0
      ? isGroup
        ? `${typingUsers.join(" and ")} ${typingUsers.length > 1 ? "are" : "is"} typing…`
        : `${typingUsers[0]} is typing…`
      : null;

  const subtitle = typingLabel
    ? typingLabel
    : isGroup
      ? `${members.length} ${members.length === 1 ? "member" : "members"}`
      : isOnline
        ? "Online"
        : lastSeenLabel || otherMember?.user.neighbourhood || "Neighbourhood member";

  // Read receipts: for DMs, mark my message as read when the other member's
  // last-read watermark has passed it.
  const isReadByOthers = (message: MessageWithReply) => {
    if (!data || message.sender_id !== user?.id) return false;
    const otherReads = data.members
      .filter((m) => m.user_id !== user.id)
      .map((m) => m.last_read_at)
      .filter((x): x is string => Boolean(x));
    return otherReads.length > 0 && otherReads.every((t) => message.created_at <= t);
  };

  // Insert date separators between messages from different days.
  const rendered: Array<{ kind: "date"; label: string; key: string } | { kind: "msg"; message: MessageWithReply; key: string }> = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    if (!previous || !isSameDay(previous.created_at, message.created_at)) {
      rendered.push({
        kind: "date",
        label: isSameDay(message.created_at, new Date().toISOString())
          ? "Today"
          : format(new Date(message.created_at), "d MMM yyyy"),
        key: `date-${message.id}`,
      });
    }
    rendered.push({ kind: "msg", message, key: message.id });
  });

  return (
    <div className="h-full flex flex-col bg-surface-container-lowest">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-xl transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </button>

        {isGroup ? (
          <Avatar
            src={data.conversation.avatar_url}
            fallback={title}
            size="md"
            className="shrink-0"
          />
        ) : (
          <Link
            href={otherMember ? `/profile/${otherMember.user.id}` : "#"}
            className="shrink-0"
          >
            <Avatar
              src={otherMember?.user.avatar_url}
              fallback={title}
              size="md"
            />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {isGroup ? (
            <h3 className="label-md font-bold text-on-surface truncate">{title}</h3>
          ) : (
            <Link
              href={otherMember ? `/profile/${otherMember.user.id}` : "#"}
              className="label-md font-bold text-on-surface truncate block hover:text-primary transition-colors"
            >
              {title}
            </Link>
          )}
          <p className="label-sm text-on-surface-variant truncate">{subtitle}</p>
        </div>

        {/* Archive toggle */}
        <button
          onClick={() => void toggleArchive()}
          disabled={archivedBusy}
          className={`p-2 rounded-xl transition-colors ${
            archived
              ? "text-primary bg-primary-fixed/30"
              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
          }`}
          aria-label={archived ? "Unarchive conversation" : "Archive conversation"}
          title={archived ? "Unarchive conversation" : "Archive conversation"}
        >
          {archived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
        </button>

        {/* Mute toggle */}
        <button
          onClick={() => void toggleMute()}
          className={`p-2 rounded-xl transition-colors ${
            muted
              ? "text-primary bg-primary-fixed/30"
              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
          }`}
          aria-label={muted ? "Unmute conversation" : "Mute conversation"}
          title={muted ? "Unmute notifications" : "Mute notifications"}
        >
          {muted ? <BellOff size={20} /> : <Bell size={20} />}
        </button>

        {isGroup && (
          <button
            onClick={() => setGroupInfoOpen(true)}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-xl transition-colors"
            aria-label="Group info"
          >
            <Users size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 bg-surface space-y-2.5 scrollbar-hide"
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={<Info size={28} />}
            title={isGroup ? "Say hello to the group" : "Start the conversation"}
            description="Send the first message — your neighbour will see it instantly."
          />
        ) : (
          rendered.map((item) =>
            item.kind === "date" ? (
              <DateSeparator key={item.key} label={item.label} />
            ) : (
              <MessageBubble
                key={item.key}
                message={item.message}
                isOwn={item.message.sender_id === user?.id}
                showSenderName={isGroup}
                read={isReadByOthers(item.message)}
                onReply={setReplyTo}
                onEdit={handleEditMessage}
                onDelete={(m) => void handleDeleteMessage(m)}
                onReport={(m) => {
                  setReportSent(false);
                  setReportReason("");
                  setReportTarget(m);
                }}
              />
            )
          )
        )}
      </div>

      {/* Reply / edit bar */}
      {(replyTo || editing) && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-outline-variant/20 bg-surface-container-low shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <CornerDownRight size={16} className="shrink-0 text-primary" />
            {editing ? (
              <p className="label-sm text-on-surface-variant truncate">Editing your message</p>
            ) : (
              <p className="label-sm text-on-surface-variant truncate">
                Replying to{" "}
                <span className="font-semibold text-on-surface">
                  {replyTo?.sender.full_name}
                </span>
                : {replyTo?.content}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setReplyTo(null);
              setEditing(null);
              setDraft("");
            }}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors shrink-0"
            aria-label="Cancel reply or edit"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 p-3 border-t border-outline-variant/20 bg-surface-container-lowest shrink-0"
      >
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            broadcastTyping();
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          name="message"
          placeholder={
            editing
              ? "Edit your message..."
              : isGroup
                ? "Message the group..."
                : "Write a message..."
          }
          aria-label="Message"
          className="flex-1 resize-none max-h-32 rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 body-md text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon-lg"
          className="shrink-0 hover-lift"
          disabled={!draft.trim() || busy}
          aria-label={editing ? "Save changes" : "Send message"}
        >
          {editing ? <CheckCircle2 size={20} /> : <Send size={20} />}
        </Button>
      </form>

      {isGroup && (
        <GroupInfoDrawer
          conversationId={conversationId}
          myRole={data.myRole}
          isOpen={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          onLeft={onBack}
        />
      )}

      {/* Report message dialog */}
      {reportTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report message"
          onClick={() => {
            if (!reportBusy) setReportTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/30 soft-card-shadow p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="headline-sm font-bold text-on-surface flex items-center gap-2">
              <Flag size={18} className="text-error" />
              Report message
            </h3>
            {reportSent ? (
              <>
                <p className="body-md text-on-surface-variant">
                  Thanks — our moderation team will review this message. Reports are kept private.
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setReportTarget(null)}
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="label-sm text-on-surface-variant line-clamp-3 bg-surface-container-low p-3 rounded-xl">
                  “{reportTarget.content}”
                </p>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface body-md outline-none focus:border-primary"
                  aria-label="Report reason"
                >
                  <option value="">Choose a reason…</option>
                  <option value="Harassment or abuse">Harassment or abuse</option>
                  <option value="Spam or scam">Spam or scam</option>
                  <option value="Inappropriate content">Inappropriate content</option>
                  <option value="Offensive language">Offensive language</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" size="md" onClick={() => setReportTarget(null)} disabled={reportBusy}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="md"
                    onClick={() => void submitReport()}
                    disabled={!reportReason.trim() || reportBusy}
                    isLoading={reportBusy}
                  >
                    Submit report
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
