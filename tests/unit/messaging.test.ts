import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local-db";

beforeEach(() => {
  localStorage.clear();
  db.reset();
});

describe("Direct conversations", () => {
  it("finds the existing direct conversation between two users", async () => {
    const conversation = await db.getOrCreateDirectConversation("user_1", "user_2");
    expect(conversation?.id).toBe("conv_1");
  });

  it("creates a direct conversation once and reuses it", async () => {
    const first = await db.getOrCreateDirectConversation("user_1", "user_3");
    const second = await db.getOrCreateDirectConversation("user_1", "user_3");
    expect(first?.id).toBe(second?.id);
    expect(first?.type).toBe("direct");
  });

  it("rejects messaging yourself or unknown users", async () => {
    expect(await db.getOrCreateDirectConversation("user_1", "user_1")).toBeNull();
    expect(await db.getOrCreateDirectConversation("user_1", "does_not_exist")).toBeNull();
  });
});

describe("Group conversations", () => {
  it("creates a group with an owner and notifies the added members", async () => {
    const group = await db.createGroupConversation({
      name: "Gardeners",
      created_by: "user_1",
      memberIds: ["user_2", "user_3"],
    });

    expect(group?.type).toBe("group");
    const members = await db.getConversationMembers(group!.id);
    expect(members).toHaveLength(3);
    expect(members.find((m) => m.user_id === "user_1")?.role).toBe("owner");

    const notifications = await db.getNotifications("user_2");
    expect(notifications.some((n) => n.type === "group_invite")).toBe(true);
  });

  it("promotes the earliest remaining member when the owner leaves", async () => {
    await db.removeConversationMember("conv_2", "user_1");
    const members = await db.getConversationMembers("conv_2");
    expect(members.find((m) => m.user_id === "user_1")).toBeUndefined();
    expect(members.find((m) => m.user_id === "user_2")?.role).toBe("owner");
  });

  it("deletes the conversation when the last member leaves", async () => {
    await db.removeConversationMember("conv_1", "user_1");
    await db.removeConversationMember("conv_1", "user_2");
    expect(await db.getConversation("conv_1")).toBeUndefined();
  });
});

describe("Messages & unread counts", () => {
  it("sends a message, notifies the other member, and bumps activity", async () => {
    const before = await db.getConversation("conv_1");
    const message = await db.sendMessage("conv_1", "user_1", "Hello Rahul!");
    expect(message?.content).toBe("Hello Rahul!");

    const after = await db.getConversation("conv_1");
    expect(after!.updated_at >= before!.updated_at).toBe(true);

    const notifications = await db.getNotifications("user_2");
    expect(notifications[0].type).toBe("message");
    expect(notifications[0].actor_id).toBe("user_1");

    // The sender never notifies themself.
    const own = await db.getNotifications("user_1");
    expect(own.filter((n) => n.actor_id === "user_1" && n.type === "message")).toHaveLength(0);
  });

  it("turns a mention into a mention notification", async () => {
    await db.sendMessage("conv_2", "user_1", "@Anita are you around tomorrow?");
    const notifications = await db.getNotifications("user_3");
    expect(notifications[0].type).toBe("mention");
  });

  it("rejects messages from non-members", async () => {
    expect(await db.sendMessage("conv_1", "user_3", "sneaking in...")).toBeNull();
    expect(await db.sendMessage("conv_404", "user_1", "hello")).toBeNull();
  });

  it("reports unread counts from the last-read watermark", async () => {
    // Seeded: Priya read the group at 5h ago; two messages arrived after.
    expect(await db.getUnreadCountByConversation("conv_2", "user_1")).toBe(2);
    expect(await db.getUnreadMessageCount("user_1")).toBe(2);
    expect(await db.getUnreadCountByConversation("conv_1", "user_1")).toBe(0);
  });

  it("clears unread counts after marking a conversation read", async () => {
    await db.markConversationRead("conv_2", "user_1");
    expect(await db.getUnreadCountByConversation("conv_2", "user_1")).toBe(0);
    expect(await db.getUnreadMessageCount("user_1")).toBe(0);
  });
});

describe("Conversation summaries", () => {
  it("sorts by last activity and resolves the other user", async () => {
    const summaries = await db.getConversationSummaries("user_1");
    expect(summaries).toHaveLength(2);
    // conv_2 was active 30m ago, conv_1 1.5h ago.
    expect(summaries[0].conversation.id).toBe("conv_2");
    expect(summaries[0].displayName).toBe("Bandra West Community");
    expect(summaries[1].displayName).toBe("Rahul Verma");
    // Last message in the DM was sent by Priya herself.
    expect(summaries[1].lastSenderName).toBe("Priya Sharma");
  });
});

describe("Notifications", () => {
  it("lists the current user's notifications newest first", async () => {
    const notifications = await db.getNotifications("user_1");
    expect(notifications.length).toBeGreaterThanOrEqual(3);
    // Newest first — the 2h-old mention from Anita outranks the 3h-old message.
    expect(notifications[0].actor?.full_name).toBe("Anita Desai");
  });

  it("creates and marks notifications read", async () => {
    await db.createNotification({
      user_id: "user_1",
      actor_id: "user_3",
      type: "system",
      content: "Test notification",
    });
    const unreadBefore = await db.getUnreadNotificationCount("user_1");
    expect(unreadBefore).toBe(3);

    await db.markAllNotificationsRead("user_1");
    expect(await db.getUnreadNotificationCount("user_1")).toBe(0);
  });
});
