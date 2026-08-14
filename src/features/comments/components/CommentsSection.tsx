"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, CornerDownRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";
import { buildThreads } from "../index";
import { formatDistanceToNow } from "date-fns";
import type { PostCommentWithUser } from "@/lib/db/types";

interface CommentsSectionProps {
  postId: string;
  postAuthorId: string;
}

export function CommentsSection({ postId, postAuthorId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostCommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<PostCommentWithUser | null>(null);
  const [posting, setPosting] = useState(false);

  const refresh = useCallback(() => {
    void db.getComments(postId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [postId]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const onChange = () => refresh();
    window.addEventListener("local-db-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("local-db-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draft.trim() || posting) return;
    setPosting(true);
    const text = draft;
    // Optimistic insert — the realtime event will reconcile on the next tick.
    const created = await db.createComment({
      postId,
      authorId: user.id,
      content: text,
      parentCommentId: replyTo?.id ?? null,
    });
    if (created) {
      // Optimistic insert; the local-db-changed event fires inside saveDB and
      // refresh() will reconcile the list — only append if not already there.
      setComments((prev) =>
        prev.some((c) => c.id === created.id)
          ? prev
          : [...prev, { ...created, user }]
      );
    }
    setDraft("");
    setReplyTo(null);
    setPosting(false);
  };

  const handleDelete = async (comment: PostCommentWithUser) => {
    if (!user) return;
    await db.deleteComment(comment.id, user.id);
    refresh();
  };

  const threads = buildThreads(comments);
  const visibleCount = comments.filter((c) => !c.deleted_at).length;

  return (
    <section aria-label="Responses" className="pt-4 border-t border-outline-variant/20 space-y-4">
      <h4 className="headline-md font-bold text-on-surface flex items-center gap-2">
        <MessageCircle size={20} />
        Responses ({visibleCount})
      </h4>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="body-md text-on-surface-variant">No responses yet — start the conversation.</p>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <div key={thread.comment.id} className="space-y-3">
              <CommentRow
                comment={thread.comment}
                isOwn={thread.comment.author_id === user?.id}
                isPostAuthor={thread.comment.author_id === postAuthorId}
                onReply={() => setReplyTo(thread.comment)}
                onDelete={() => void handleDelete(thread.comment)}
              />
              {thread.replies.map((reply) => (
                <div key={reply.id} className="pl-6 sm:pl-10 border-l-2 border-outline-variant/30">
                  <CommentRow
                    comment={reply}
                    isOwn={reply.author_id === user?.id}
                    isPostAuthor={reply.author_id === postAuthorId}
                    isReply
                    onReply={() => setReplyTo(reply)}
                    onDelete={() => void handleDelete(reply)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30">
          <p className="label-sm text-on-surface-variant truncate">
            <CornerDownRight size={14} className="inline mr-1 -mt-0.5" />
            Replying to <span className="font-semibold text-on-surface">{replyTo.user.full_name}</span>
          </p>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="label-sm font-bold text-primary hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {user ? (
        <form onSubmit={handlePost} className="space-y-3 pt-1">
          <Textarea
            rows={3}
            placeholder={replyTo ? "Write your reply..." : "Write a response or reply..."}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            name="comment"
            required
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="hover-lift"
              disabled={!draft.trim() || posting}
              isLoading={posting}
              rightIcon={<Send size={16} />}
            >
              {replyTo ? "Post Reply" : "Post Response"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="body-md text-on-surface-variant">
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  isOwn,
  isPostAuthor,
  isReply = false,
  onReply,
  onDelete,
}: {
  comment: PostCommentWithUser;
  isOwn: boolean;
  isPostAuthor: boolean;
  isReply?: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const authorName = comment.user.full_name || "Neighbour";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) return;
    await db.updateComment(comment.id, comment.user.id, editText);
    setEditing(false);
  };

  if (comment.deleted_at) {
    return (
      <div className="p-4 rounded-2xl bg-surface-container-low/50 border border-dashed border-outline-variant/40">
        <p className="body-md text-on-surface-variant italic">This response was deleted.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/profile/${comment.user.id}`} className="shrink-0">
            <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center text-xs overflow-hidden">
              {comment.user.avatar_url ? (
                <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                authorName.charAt(0).toUpperCase()
              )}
            </div>
          </Link>
          <Link
            href={`/profile/${comment.user.id}`}
            className="label-md font-bold text-on-surface hover:text-primary transition-colors"
          >
            {authorName}
          </Link>
          {isPostAuthor && (
            <span className="px-2 py-0.5 rounded-full label-sm bg-secondary-container/60 text-on-secondary-container">
              Author
            </span>
          )}
          <span className="label-sm text-on-surface-variant/70">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>

        {isOwn && !editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditText(comment.content);
                setEditing(true);
              }}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
              aria-label="Edit response"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
              aria-label="Delete response"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="space-y-2">
          <Textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} name="edit-comment" />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!editText.trim()}>
              Save
            </Button>
          </div>
        </form>
      ) : (
        <p className="body-md text-on-surface-variant whitespace-pre-wrap break-words">
          {comment.content}
          {comment.updated_at !== comment.created_at && (
            <span className="label-sm text-on-surface-variant/60 ml-1">(edited)</span>
          )}
        </p>
      )}

      {!editing && !isReply && (
        <button
          type="button"
          onClick={onReply}
          className="label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <CornerDownRight size={13} /> Reply
        </button>
      )}
    </div>
  );
}
