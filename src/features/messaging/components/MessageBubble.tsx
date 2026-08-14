import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatClockTime } from "@/lib/utils/format";
import { CornerDownRight, Check, CheckCheck, Pencil, Reply, Trash2, Flag } from "lucide-react";
import type { MessageWithReply, MessageWithSender } from "@/lib/db/types";

interface MessageBubbleProps {
  message: MessageWithReply;
  isOwn: boolean;
  /** Show the sender's name above the bubble (group chats, other people). */
  showSenderName?: boolean;
  /** True when every other member has read this message (read receipt). */
  read?: boolean;
  onReply?: (message: MessageWithReply) => void;
  onEdit?: (message: MessageWithReply) => void;
  onDelete?: (message: MessageWithReply) => void;
  onReport?: (message: MessageWithReply) => void;
}

function ReplyQuote({ message }: { message: MessageWithSender }) {
  return (
    <div className="flex items-start gap-1.5 px-3 py-1.5 mb-1.5 rounded-xl bg-surface-container-low/80 border-l-2 border-primary/60 max-w-full">
      <CornerDownRight size={13} className="mt-0.5 shrink-0 opacity-70" />
      <div className="min-w-0">
        <p className="label-sm font-bold truncate">
          {message.sender.full_name || "Neighbour"}
        </p>
        <p className="label-sm truncate opacity-80">
          {message.deleted_at ? "Message deleted" : message.content}
        </p>
      </div>
    </div>
  );
}

/**
 * MessageBubble — a subtle chat bubble in the Aas-Paas visual language.
 * Own messages use the warm terracotta fixed palette; other messages sit on a
 * soft surface tone with a hairline border. Rounded but not exaggerated.
 */
export function MessageBubble({
  message,
  isOwn,
  showSenderName = false,
  read = false,
  onReply,
  onEdit,
  onDelete,
  onReport,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = onEdit !== undefined && onDelete !== undefined;
  const canReport = onReport !== undefined && !isOwn;

  return (
    <div
      className={cn(
        "group relative flex flex-col max-w-[85%] sm:max-w-[72%]",
        isOwn ? "items-end self-end" : "items-start self-start"
      )}
    >
      {showSenderName && !isOwn && (
        <span className="label-sm font-bold text-primary mb-1 ml-1">{message.sender.full_name}</span>
      )}

      {/* Hover actions (own: edit/delete; others: reply/report) */}
      {(canManage || canReport) && (
        <div
          className={cn(
            "hidden sm:flex absolute -top-2 gap-0.5 p-0.5 rounded-xl bg-surface-container-high border border-outline-variant/30 shadow-sm",
            isOwn ? "-left-12" : "-right-12",
            menuOpen && "flex"
          )}
        >
          <button
            onClick={() => onReply?.(message)}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            aria-label="Reply"
            title="Reply"
          >
            <Reply size={13} />
          </button>
          {isOwn && !message.deleted_at && (
            <>
              <button
                onClick={() => onEdit?.(message)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                aria-label="Edit"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete?.(message)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {canReport && !message.deleted_at && (
            <button
              onClick={() => onReport?.(message)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
              aria-label="Report message"
              title="Report message"
            >
              <Flag size={13} />
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          "px-4 py-2.5 rounded-2xl border leading-relaxed",
          isOwn
            ? "bg-primary-fixed/50 border-primary-fixed/70 text-on-primary-fixed-variant rounded-br-md"
            : "bg-surface-container-low border-outline-variant/30 text-on-surface rounded-bl-md",
          "soft-card-shadow"
        )}
      >
        {message.replyTo && <ReplyQuote message={message.replyTo} />}

        {message.deleted_at ? (
          <p className="body-md italic opacity-60">Message deleted</p>
        ) : (
          <p className="body-md whitespace-pre-wrap break-words">{message.content}</p>
        )}

        <span
          className={cn(
            "flex items-center justify-end gap-1 text-right mt-1 text-[11px] leading-none",
            isOwn ? "text-on-primary-fixed-variant/50" : "text-on-surface-variant/60"
          )}
        >
          {formatClockTime(message.created_at)}
          {message.edited_at && !message.deleted_at && <span className="opacity-70">· edited</span>}
          {isOwn && !message.deleted_at && (read ? <CheckCheck size={13} /> : <Check size={13} />)}
        </span>
      </div>

      {/* Mobile tap target for actions */}
      {canManage && !menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          className="sm:hidden mt-0.5 label-sm font-semibold text-on-surface-variant/70"
          aria-label="Message actions"
        >
          ···
        </button>
      )}
      {menuOpen && (
        <div className="sm:hidden flex gap-2 mt-1 flex-wrap">
          <button
            onClick={() => {
              onReply?.(message);
              setMenuOpen(false);
            }}
            className="px-3 py-1 rounded-lg label-sm font-semibold bg-surface-container-high text-on-surface"
          >
            Reply
          </button>
          {isOwn && !message.deleted_at && (
            <>
              <button
                onClick={() => {
                  onEdit?.(message);
                  setMenuOpen(false);
                }}
                className="px-3 py-1 rounded-lg label-sm font-semibold bg-surface-container-high text-on-surface"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete?.(message);
                  setMenuOpen(false);
                }}
                className="px-3 py-1 rounded-lg label-sm font-semibold bg-error-container text-on-error-container"
              >
                Delete
              </button>
            </>
          )}
          {canReport && !message.deleted_at && (
            <button
              onClick={() => {
                onReport?.(message);
                setMenuOpen(false);
              }}
              className="px-3 py-1 rounded-lg label-sm font-semibold bg-error-container text-on-error-container"
            >
              Report
            </button>
          )}
        </div>
      )}
    </div>
  );
}
