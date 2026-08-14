/**
 * src/features/comments/index.ts — live comments
 *
 * Comments live in the local data layer (LocalDatabase) and sync in real time
 * through the local-db-changed event + cross-tab storage sync — the same
 * mechanism every other Aas-Paas feed uses. The production `post_comments`
 * table (see migrations) mirrors this shape for the server cutover.
 */

import { db } from "@/lib/db/local-db";
import type { PostCommentWithUser } from "@/lib/db/types";

/** Top-level comments plus their replies, ordered for rendering. */
export type CommentThread = {
  comment: PostCommentWithUser;
  replies: PostCommentWithUser[];
};

/**
 * Group comments into threads. Soft-deleted comments still render (as
 * "deleted") so the thread context stays intact.
 */
export function buildThreads(comments: PostCommentWithUser[]): CommentThread[] {
  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const replies = comments.filter((c) => c.parent_comment_id);

  return topLevel.map((comment) => ({
    comment,
    replies: replies.filter((r) => r.parent_comment_id === comment.id),
  }));
}

/** Load a post's comments (used for the initial fetch). */
export async function loadComments(postId: string): Promise<PostCommentWithUser[]> {
  return db.getComments(postId);
}

export { db };
