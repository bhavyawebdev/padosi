import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local-db";
import { STORAGE_KEY } from "@/lib/db/local-db";

beforeEach(() => {
  // Fresh in-memory DB per test (jsdom provides localStorage).
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({})); // force re-init next access
  // Re-read through the singleton — getInitialDB backfills from seeds.
});

describe("Comments", () => {
  it("adds a comment and notifies the post author", async () => {
    const comment = await db.createComment({
      postId: "post_1",
      authorId: "user_2",
      content: "Spotted near the garden!",
    });
    expect(comment).not.toBeNull();
    expect(comment?.content).toBe("Spotted near the garden!");
    expect((await db.getComments("post_1")).length).toBeGreaterThan(0);

    const notifications = await db.getNotifications("user_1");
    expect(notifications.some((n) => n.type === "comment")).toBe(true);
  });

  it("supports replies and notifies the parent's author", async () => {
    const parent = await db.createComment({
      postId: "post_1",
      authorId: "user_2",
      content: "A lead!",
    });
    await db.createComment({
      postId: "post_1",
      authorId: "user_1",
      content: "Thanks!",
      parentCommentId: parent?.id,
    });
    const comments = await db.getComments("post_1");
    const reply = comments.find((c) => c.parent_comment_id === parent?.id);
    expect(reply).toBeDefined();
    expect((await db.getNotifications("user_2")).some((n) => n.type === "reply")).toBe(true);
  });

  it("soft-deletes comments but keeps the row", async () => {
    const comment = await db.createComment({
      postId: "post_1",
      authorId: "user_2",
      content: "Remove me",
    });
    expect(comment).not.toBeNull();
    const deleted = await db.deleteComment(comment!.id, "user_2");
    expect(deleted).toBe(true);
    const comments = await db.getComments("post_1");
    const row = comments.find((c) => c.id === comment?.id);
    expect(row?.deleted_at).toBeTruthy();
  });

  it("does not let another user delete a comment", async () => {
    const comment = await db.createComment({
      postId: "post_1",
      authorId: "user_2",
      content: "Mine",
    });
    expect(await db.deleteComment(comment!.id, "user_3")).toBe(false);
  });
});

describe("Reactions", () => {
  it("toggles a like and updates the count", async () => {
    const before = await db.getReactionCount("post_1");
    const liked = await db.toggleReaction("post_1", "user_demo");
    expect(liked.reacted).toBe(true);
    expect(liked.count).toBe(before + 1);

    const unliked = await db.toggleReaction("post_1", "user_demo");
    expect(unliked.reacted).toBe(false);
    expect(unliked.count).toBe(before);
  });

  it("notifies the author on first like", async () => {
    // user_demo has no seeded reaction on post_1, so this is a first like.
    await db.toggleReaction("post_1", "user_demo");
    const notifications = await db.getNotifications("user_1");
    expect(notifications.some((n) => n.type === "reaction")).toBe(true);
  });
});

describe("Blocks", () => {
  it("blocks and unblocks a user", async () => {
    expect(await db.isBlocked("user_1", "user_2")).toBe(false);
    await db.blockUser("user_1", "user_2");
    expect(await db.isBlocked("user_1", "user_2")).toBe(true);
    await db.unblockUser("user_1", "user_2");
    expect(await db.isBlocked("user_1", "user_2")).toBe(false);
  });

  it("prevents starting a conversation with a blocked user", async () => {
    await db.blockUser("user_1", "user_2");
    expect(await db.getOrCreateDirectConversation("user_1", "user_2")).toBeNull();
  });

  it("prevents sending messages to a blocked conversation", async () => {
    await db.blockUser("user_1", "user_2");
    // Pre-existing seeded conversation conv_1 is between user_1 and user_2.
    expect(await db.sendMessage("conv_1", "user_1", "hello?")).toBeNull();
  });

  it("hides blocked users' conversations from summaries", async () => {
    await db.blockUser("user_1", "user_2");
    const summaries = await db.getConversationSummaries("user_1");
    expect(summaries.some((s) => s.displayName === "Rahul Verma")).toBe(false);
  });
});

describe("Reports", () => {
  it("files a report and stores it", async () => {
    const report = await db.createReport({
      reporterId: "user_1",
      targetType: "user",
      targetId: "user_2",
      reason: "Harassment or abuse",
    });
    expect(report).not.toBeNull();
    expect(report?.status).toBe("open");
  });
});

describe("Message reply / edit / delete / mute", () => {
  it("sends a message replying to another", async () => {
    const reply = await db.sendMessage("conv_1", "user_1", "on my way!", "msg_3");
    expect(reply?.reply_to_message_id).toBe("msg_3");
    const messages = await db.getMessagesWithReplies("conv_1");
    const withReply = messages.find((m) => m.id === reply?.id);
    expect(withReply?.replyTo?.content).toContain("water tank");
  });

  it("edits an own message and marks edited_at", async () => {
    const edited = await db.editMessage("msg_4", "user_1", "Updated message");
    expect(edited?.content).toBe("Updated message");
    expect(edited?.edited_at).toBeTruthy();
    expect(await db.editMessage("msg_4", "user_2", "nope")).toBeNull();
  });

  it("soft-deletes a message", async () => {
    expect(await db.deleteMessage("msg_4", "user_1")).toBe(true);
    expect(await db.deleteMessage("msg_4", "user_2")).toBe(false);
  });

  it("mutes and unmutes a conversation", async () => {
    expect(await db.isConversationMuted("conv_2", "user_demo")).toBe(false);
    await db.muteConversation("conv_2", "user_demo");
    expect(await db.isConversationMuted("conv_2", "user_demo")).toBe(true);
    await db.unmuteConversation("conv_2", "user_demo");
    expect(await db.isConversationMuted("conv_2", "user_demo")).toBe(false);
  });

  it("does not notify muted members", async () => {
    await db.muteConversation("conv_2", "user_3");
    await db.sendMessage("conv_2", "user_2", "hello muted members");
    const notifications = await db.getNotifications("user_3");
    expect(
      notifications.filter((n) => n.content === "hello muted members").length
    ).toBe(0);
  });
});

describe("Archiving", () => {
  it("archives and unarchives a conversation for a member", async () => {
    expect(await db.isConversationArchived("conv_1", "user_1")).toBe(false);
    await db.archiveConversation("conv_1", "user_1");
    expect(await db.isConversationArchived("conv_1", "user_1")).toBe(true);

    const summaries = await db.getConversationSummaries("user_1");
    expect(summaries.find((s) => s.conversation.id === "conv_1")?.archived).toBe(true);

    await db.unarchiveConversation("conv_1", "user_1");
    expect(await db.isConversationArchived("conv_1", "user_1")).toBe(false);
  });

  it("archives only for the member who archived", async () => {
    await db.archiveConversation("conv_2", "user_1");
    // Another member still sees it unarchived.
    const other = await db.getConversationSummaries("user_2");
    expect(other.find((s) => s.conversation.id === "conv_2")?.archived).toBe(false);
  });
});
