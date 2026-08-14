import {
  User,
  NearbyPost,
  HelpProfile,
  HelpRequest,
  Conversation,
  ConversationMember,
  Message,
  MessageRead,
  AppNotification,
  ConversationSummary,
  ConversationMemberWithUser,
  MessageWithSender,
  MessageWithReply,
  NotificationWithActor,
  MemberRole,
  PostComment,
  PostReaction,
  Block,
  Report,
  PostCommentWithUser,
  ReportTargetType,
} from "./types";
import {
  MOCK_USERS,
  MOCK_NEARBY_POSTS,
  MOCK_HELP_PROFILES,
  MOCK_HELP_REQUESTS,
  MOCK_CONVERSATIONS,
  MOCK_CONVERSATION_MEMBERS,
  MOCK_MESSAGES,
  MOCK_MESSAGE_READS,
  MOCK_NOTIFICATIONS,
  MOCK_COMMENTS,
  MOCK_REACTIONS,
} from "./mock-data";

export const STORAGE_KEY = "aas_paas_local_db";

interface DatabaseSchema {
  users: User[];
  nearby_posts: NearbyPost[];
  help_profiles: HelpProfile[];
  help_requests: HelpRequest[];
  conversations: Conversation[];
  conversation_members: ConversationMember[];
  messages: Message[];
  message_reads: MessageRead[];
  notifications: AppNotification[];
  comments: PostComment[];
  reactions: PostReaction[];
  blocks: Block[];
  reports: Report[];
}

class LocalDatabase {
  private isClient = typeof window !== "undefined";

  private getDB(): DatabaseSchema {
    if (!this.isClient) return this.getInitialDB();
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const initial = this.getInitialDB();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const stored = JSON.parse(data) as Partial<DatabaseSchema>;
    const initial = this.getInitialDB();
    // Backfill collections introduced in newer app versions (e.g. messaging),
    // so databases created by older builds keep working untouched.
    return { ...initial, ...stored } as DatabaseSchema;
  }

  private saveDB(db: DatabaseSchema) {
    if (!this.isClient) return;
    this.pruneNotifications(db);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    // Dispatch event so other components can re-render if needed
    window.dispatchEvent(new Event("local-db-changed"));
  }

  /**
   * Keep at most NOTIFICATION_CAP per user (newest first). Group chats create
   * one notification per member per message, so without a cap a busy
   * conversation would eventually blow past the localStorage budget.
   */
  private pruneNotifications(db: DatabaseSchema, cap = 60) {
    if (db.notifications.length <= cap) return;
    const userIds = Array.from(new Set(db.notifications.map((n) => n.user_id)));
    const keepIds = new Set<string>();
    for (const uid of userIds) {
      db.notifications
        .filter((n) => n.user_id === uid)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, cap)
        .forEach((n) => keepIds.add(n.id));
    }
    db.notifications = db.notifications.filter((n) => keepIds.has(n.id));
  }

  private getInitialDB(): DatabaseSchema {
    // Clone the seed constants so in-place mutations (e.g. marking a
    // notification read) never leak into the module-level mock data.
    return {
      users: MOCK_USERS.map((u) => ({ ...u })),
      nearby_posts: MOCK_NEARBY_POSTS.map((p) => ({ ...p })),
      help_profiles: MOCK_HELP_PROFILES.map((p) => ({ ...p })),
      help_requests: MOCK_HELP_REQUESTS.map((r) => ({ ...r })),
      conversations: MOCK_CONVERSATIONS.map((c) => ({ ...c })),
      conversation_members: MOCK_CONVERSATION_MEMBERS.map((m) => ({ ...m })),
      messages: MOCK_MESSAGES.map((m) => ({ ...m })),
      message_reads: MOCK_MESSAGE_READS.map((r) => ({ ...r })),
      notifications: MOCK_NOTIFICATIONS.map((n) => ({ ...n })),
      comments: MOCK_COMMENTS.map((c) => ({ ...c })),
      reactions: MOCK_REACTIONS.map((r) => ({ ...r })),
      blocks: [],
      reports: [],
    };
  }

  public reset() {
    if (!this.isClient) return;
    localStorage.removeItem(STORAGE_KEY);
    this.getDB(); // Re-initialize
    window.dispatchEvent(new Event("local-db-changed"));
  }

  // --- Users ---
  public async getUser(id: string): Promise<User | undefined> {
    return this.getDB().users.find((u) => u.id === id);
  }

  public async getUsers(): Promise<User[]> {
    return this.getDB().users;
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    return this.getDB().users.find((u) => u.email === email);
  }

  public async createUser(user: Omit<User, "id" | "created_at" | "updated_at">): Promise<User> {
    const db = this.getDB();
    const newUser: User = {
      ...user,
      id: `user_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    this.saveDB(db);
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const db = this.getDB();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    db.users[index] = { ...db.users[index], ...updates, updated_at: new Date().toISOString() };
    this.saveDB(db);
    return db.users[index];
  }

  // --- Nearby Posts ---
  public async getNearbyPosts(): Promise<(NearbyPost & { user: User })[]> {
    const db = this.getDB();
    return db.nearby_posts
      .map((post) => {
        const user = db.users.find((u) => u.id === post.user_id)!;
        return { ...post, user };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async createNearbyPost(post: Omit<NearbyPost, "id" | "created_at" | "updated_at">): Promise<NearbyPost> {
    const db = this.getDB();
    const newPost: NearbyPost = {
      ...post,
      id: `post_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.nearby_posts.push(newPost);
    this.saveDB(db);
    return newPost;
  }

  // --- Help Profiles ---
  public async getHelpProfiles(): Promise<(HelpProfile & { user: User })[]> {
    const db = this.getDB();
    return db.help_profiles
      .map((profile) => {
        const user = db.users.find((u) => u.id === profile.user_id)!;
        return { ...profile, user };
      })
      .sort((a, b) => b.rating - a.rating);
  }

  public async createHelpProfile(profile: Omit<HelpProfile, "id" | "created_at" | "updated_at" | "is_verified" | "rating">): Promise<HelpProfile> {
    const db = this.getDB();
    const newProfile: HelpProfile = {
      ...profile,
      id: `help_${Date.now()}`,
      is_verified: false,
      rating: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.help_profiles.push(newProfile);
    this.saveDB(db);
    return newProfile;
  }

  // --- Conversations ---

  public async getConversation(id: string): Promise<Conversation | undefined> {
    return this.getDB().conversations.find((c) => c.id === id);
  }

  public async getConversationMembers(
    conversationId: string
  ): Promise<ConversationMemberWithUser[]> {
    const db = this.getDB();
    const result: ConversationMemberWithUser[] = [];
    for (const m of db.conversation_members) {
      if (m.conversation_id !== conversationId) continue;
      const user = db.users.find((u) => u.id === m.user_id);
      if (!user) continue;
      const read = db.message_reads.find(
        (r) => r.conversation_id === conversationId && r.user_id === m.user_id
      );
      result.push({
        ...m,
        last_read_at: read?.last_read_at ?? m.last_read_at ?? null,
        user,
      });
    }
    return result.sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  }

  public async getMemberRole(
    conversationId: string,
    userId: string
  ): Promise<MemberRole | null> {
    const member = this.getDB().conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    return member ? member.role : null;
  }

  public async getConversationSummaries(
    userId: string
  ): Promise<ConversationSummary[]> {
    const db = this.getDB();
    const memberships = db.conversation_members.filter((m) => m.user_id === userId);

    // Drop conversations with anyone the user has blocked (either direction),
    // so blocked people never appear in the list either.
    const blockedIds = new Set(
      db.blocks
        .filter((b) => b.blocker_id === userId || b.blocked_id === userId)
        .map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id))
    );

    const summaries = memberships.map((membership) => {
      const conversation = db.conversations.find(
        (c) => c.id === membership.conversation_id
      )!;
      const allMembers = db.conversation_members.filter(
        (m) => m.conversation_id === conversation.id
      );
      const otherMembers = allMembers.filter((m) => m.user_id !== userId);
      const messages = db.messages
        .filter((m) => m.conversation_id === conversation.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const lastMessage = messages[0] ?? null;
      const lastSender = lastMessage
        ? db.users.find((u) => u.id === lastMessage.sender_id)
        : undefined;

      const isGroup = conversation.type === "group";
      const otherUser = otherMembers[0]?.user_id
        ? db.users.find((u) => u.id === otherMembers[0].user_id)
        : undefined;

      return {
        conversation,
        displayName: isGroup
          ? conversation.name || "Community Group"
          : otherUser?.full_name || "Neighbour",
        avatarUrl: isGroup
          ? conversation.avatar_url
          : otherUser?.avatar_url || null,
        lastMessage,
        lastSenderName: lastSender?.full_name || null,
        unreadCount: this.getUnreadCount(
          db,
          conversation,
          allMembers,
          userId
        ),
        memberCount: allMembers.length,
      };
    });

    return summaries
      .filter((s) => {
        if (s.conversation.type === "direct") {
          const otherId = db.conversation_members
            .filter(
              (m) =>
                m.conversation_id === s.conversation.id && m.user_id !== userId
            )
            .map((m) => m.user_id)[0];
          return !otherId || !blockedIds.has(otherId);
        }
        return true;
      })
      .map((s) => {
        const myMembership = db.conversation_members.find(
          (m) =>
            m.conversation_id === s.conversation.id && m.user_id === userId
        );
        return { ...s, archived: Boolean(myMembership?.archived_at) };
      })
      .sort((a, b) =>
        b.conversation.updated_at.localeCompare(a.conversation.updated_at)
      );
  }

  private getUnreadCount(
    db: DatabaseSchema,
    conversation: Conversation,
    members: ConversationMember[],
    userId: string
  ): number {
    const member = members.find((m) => m.user_id === userId);
    const read = db.message_reads.find(
      (r) => r.conversation_id === conversation.id && r.user_id === userId
    );
    const baseline = read
      ? read.last_read_at
      : member?.joined_at || conversation.created_at;
    return db.messages.filter(
      (m) =>
        m.conversation_id === conversation.id &&
        m.sender_id !== userId &&
        m.created_at > baseline
    ).length;
  }

  /**
   * Find the direct conversation between two users, creating it if needed.
   * Returns null if the other user doesn't exist or both ids are the same.
   */
  public async getOrCreateDirectConversation(
    userId: string,
    otherUserId: string
  ): Promise<Conversation | null> {
    if (!userId || !otherUserId || userId === otherUserId) return null;
    const db = this.getDB();
    if (!db.users.some((u) => u.id === otherUserId)) return null;
    // Blocks are enforced at the data layer, not just hidden in the UI.
    if (this.isBlockedBetween(db, userId, otherUserId)) return null;

    const found = this.findDirectConversation(db, userId, otherUserId);
    if (found) return found;

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: "direct",
      name: null,
      avatar_url: null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };
    db.conversations.push(conversation);
    db.conversation_members.push(
      {
        id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        conversation_id: conversation.id,
        user_id: userId,
        role: "owner",
        joined_at: now,
      },
      {
        id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        conversation_id: conversation.id,
        user_id: otherUserId,
        role: "member",
        joined_at: now,
      }
    );
    this.saveDB(db);
    return conversation;
  }

  private findDirectConversation(
    db: DatabaseSchema,
    userId: string,
    otherUserId: string
  ): Conversation | undefined {
    return db.conversations.find((c) => {
      if (c.type !== "direct") return false;
      const members = db.conversation_members.filter(
        (m) => m.conversation_id === c.id
      );
      return (
        members.length === 2 &&
        members.some((m) => m.user_id === userId) &&
        members.some((m) => m.user_id === otherUserId)
      );
    });
  }

  public async createGroupConversation(input: {
    name: string;
    avatar_url?: string | null;
    created_by: string;
    memberIds: string[];
  }): Promise<Conversation | null> {
    const db = this.getDB();
    const name = input.name.trim();
    if (!name || input.memberIds.length === 0) return null;
    const memberIds = Array.from(
      new Set([input.created_by, ...input.memberIds])
    ).filter((id) => db.users.some((u) => u.id === id));
    if (memberIds.length < 2) return null;

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: "group",
      name,
      avatar_url: input.avatar_url?.trim() || null,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    };
    db.conversations.push(conversation);

    const creator = db.users.find((u) => u.id === input.created_by);
    memberIds.forEach((userId, index) => {
      db.conversation_members.push({
        id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${index}`,
        conversation_id: conversation.id,
        user_id: userId,
        role: index === 0 ? "owner" : "member",
        joined_at: now,
      });
    });

    // Notify everyone added to the group (excluding the creator).
    memberIds
      .filter((id) => id !== input.created_by)
      .forEach((id) => {
        db.notifications.push(this.buildNotification({
          db,
          userId: id,
          actorId: input.created_by,
          type: "group_invite",
          content: `${creator?.full_name || "A neighbour"} added you to ${name}.`,
          relatedLink: `/messages?c=${conversation.id}`,
          now,
        }));
      });

    this.saveDB(db);
    return conversation;
  }

  public async updateGroupConversation(
    id: string,
    updates: { name?: string; avatar_url?: string | null }
  ): Promise<Conversation | null> {
    const db = this.getDB();
    const conversation = db.conversations.find((c) => c.id === id);
    if (!conversation || conversation.type !== "group") return null;
    if (updates.name !== undefined) conversation.name = updates.name.trim() || conversation.name;
    if (updates.avatar_url !== undefined) conversation.avatar_url = updates.avatar_url?.trim() || null;
    conversation.updated_at = new Date().toISOString();
    this.saveDB(db);
    return conversation;
  }

  /** Add members to a group and notify them. */
  public async addConversationMembers(
    conversationId: string,
    memberIds: string[],
    actorId: string
  ): Promise<void> {
    const db = this.getDB();
    const conversation = db.conversations.find((c) => c.id === conversationId);
    if (!conversation || conversation.type !== "group") return;
    const now = new Date().toISOString();
    const existing = new Set(
      db.conversation_members
        .filter((m) => m.conversation_id === conversationId)
        .map((m) => m.user_id)
    );
    const actor = db.users.find((u) => u.id === actorId);
    const added: string[] = [];

    for (const userId of memberIds) {
      if (existing.has(userId) || !db.users.some((u) => u.id === userId)) continue;
      db.conversation_members.push({
        id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        conversation_id: conversationId,
        user_id: userId,
        role: "member",
        joined_at: now,
      });
      db.notifications.push(this.buildNotification({
        db,
        userId,
        actorId,
        type: "group_invite",
        content: `${actor?.full_name || "A neighbour"} added you to ${conversation.name || "a group"}.`,
        relatedLink: `/messages?c=${conversationId}`,
        now,
      }));
      added.push(userId);
    }

    if (added.length > 0) {
      conversation.updated_at = now;
      this.saveDB(db);
    }
  }

  /**
   * Remove a member (self-leave, or admin/owner removing someone).
   * If the owner leaves, ownership transfers to the earliest remaining member.
   */
  public async removeConversationMember(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const db = this.getDB();
    const index = db.conversation_members.findIndex(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    if (index === -1) return;
    const removed = db.conversation_members[index];
    db.conversation_members.splice(index, 1);

    const remaining = db.conversation_members.filter(
      (m) => m.conversation_id === conversationId
    );
    const conversation = db.conversations.find((c) => c.id === conversationId);

    if (remaining.length === 0) {
      // Conversation has no members left — remove it and its data.
      db.conversations = db.conversations.filter((c) => c.id !== conversationId);
      db.messages = db.messages.filter((m) => m.conversation_id !== conversationId);
      db.message_reads = db.message_reads.filter(
        (r) => r.conversation_id !== conversationId
      );
      this.saveDB(db);
      return;
    }

    if (removed.role === "owner" && conversation) {
      const nextOwner = remaining.sort((a, b) =>
        a.joined_at.localeCompare(b.joined_at)
      )[0];
      nextOwner.role = "owner";
    }

    if (conversation) conversation.updated_at = new Date().toISOString();
    this.saveDB(db);
  }

  // --- Messages ---

  public async getMessages(conversationId: string): Promise<MessageWithSender[]> {
    const db = this.getDB();
    return db.messages
      .filter((m) => m.conversation_id === conversationId)
      .map((m) => {
        const sender = db.users.find((u) => u.id === m.sender_id);
        return sender ? { ...m, sender } : null;
      })
      .filter((x): x is MessageWithSender => x !== null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  /** Messages joined with the reply target they quote (if any). */
  public async getMessagesWithReplies(conversationId: string): Promise<MessageWithReply[]> {
    const db = this.getDB();
    const messages = db.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const byId = new Map(db.messages.map((m) => [m.id, m]));

    return messages
      .map((m) => {
        const sender = db.users.find((u) => u.id === m.sender_id);
        if (!sender) return null;
        const replyTarget = m.reply_to_message_id
          ? byId.get(m.reply_to_message_id)
          : undefined;
        const replyTo =
          replyTarget && replyTarget.sender_id
            ? {
                ...replyTarget,
                sender: db.users.find((u) => u.id === replyTarget.sender_id) ?? sender,
              }
            : null;
        return { ...m, sender, replyTo };
      })
      .filter((x): x is MessageWithReply => x !== null);
  }

  public async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    replyToMessageId?: string | null
  ): Promise<Message | null> {
    const db = this.getDB();
    const trimmed = content.trim();
    if (!trimmed) return null;

    const isMember = db.conversation_members.some(
      (m) => m.conversation_id === conversationId && m.user_id === senderId
    );
    const conversation = db.conversations.find((c) => c.id === conversationId);
    if (!isMember || !conversation) return null;

    // Never allow sending into a conversation where either party is blocked.
    const memberIds = db.conversation_members
      .filter((m) => m.conversation_id === conversationId)
      .map((m) => m.user_id);
    for (const otherId of memberIds) {
      if (otherId !== senderId && this.isBlockedBetween(db, senderId, otherId)) return null;
    }

    // Validate the reply target belongs to this conversation.
    let replyToMessageIdResolved: string | null = null;
    if (replyToMessageId) {
      const target = db.messages.find(
        (m) => m.id === replyToMessageId && m.conversation_id === conversationId
      );
      if (target) replyToMessageIdResolved = target.id;
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmed.slice(0, 2000),
      reply_to_message_id: replyToMessageIdResolved,
      created_at: now,
    };
    db.messages.push(message);
    conversation.updated_at = now;

    // Notify the other members (mention type when someone is tagged). Skip
    // members who muted the conversation or who blocked the sender.
    const members = db.conversation_members.filter(
      (m) => m.conversation_id === conversationId && m.user_id !== senderId
    );
    members.forEach((member) => {
      if (this.isBlockedBetween(db, senderId, member.user_id)) return;
      if (member.muted_until && member.muted_until > now) return;
      const user = db.users.find((u) => u.id === member.user_id);
      db.notifications.push(
        this.buildNotification({
          db,
          userId: member.user_id,
          actorId: senderId,
          type: this.isMentioned(trimmed, user) ? "mention" : "message",
          content: trimmed,
          relatedLink: `/messages?c=${conversationId}`,
          now,
        })
      );
    });

    // The sender has obviously seen their own message.
    this.upsertRead(db, conversationId, senderId, now);

    this.saveDB(db);
    return message;
  }

  /** Edit one of the sender's own messages. */
  public async editMessage(
    messageId: string,
    senderId: string,
    content: string
  ): Promise<Message | null> {
    const db = this.getDB();
    const trimmed = content.trim();
    if (!trimmed) return null;
    const message = db.messages.find(
      (m) => m.id === messageId && m.sender_id === senderId && !m.deleted_at
    );
    if (!message) return null;
    message.content = trimmed.slice(0, 2000);
    message.edited_at = new Date().toISOString();
    this.saveDB(db);
    return message;
  }

  /** Soft-delete a message (only the sender). */
  public async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    const db = this.getDB();
    const message = db.messages.find(
      (m) => m.id === messageId && m.sender_id === senderId && !m.deleted_at
    );
    if (!message) return false;
    message.deleted_at = new Date().toISOString();
    this.saveDB(db);
    return true;
  }

  /** Mute a conversation for a member (e.g. for 24 hours). */
  public async muteConversation(
    conversationId: string,
    userId: string,
    durationMs = 24 * 60 * 60 * 1000
  ): Promise<void> {
    const db = this.getDB();
    const member = db.conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    if (!member) return;
    member.muted_until = new Date(Date.now() + durationMs).toISOString();
    this.saveDB(db);
  }

  public async unmuteConversation(conversationId: string, userId: string): Promise<void> {
    const db = this.getDB();
    const member = db.conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    if (!member) return;
    member.muted_until = null;
    this.saveDB(db);
  }

  public async isConversationMuted(conversationId: string, userId: string): Promise<boolean> {
    const member = this.getDB().conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    return Boolean(member?.muted_until && member.muted_until > new Date().toISOString());
  }

  /** Archive a conversation for a member (hides it from the default list). */
  public async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const db = this.getDB();
    const member = db.conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    if (!member) return;
    member.archived_at = new Date().toISOString();
    this.saveDB(db);
  }

  public async unarchiveConversation(conversationId: string, userId: string): Promise<void> {
    const db = this.getDB();
    const member = db.conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    if (!member) return;
    member.archived_at = null;
    this.saveDB(db);
  }

  public async isConversationArchived(conversationId: string, userId: string): Promise<boolean> {
    const member = this.getDB().conversation_members.find(
      (m) => m.conversation_id === conversationId && m.user_id === userId
    );
    return Boolean(member?.archived_at);
  }

  /** Presence: bump the user's last-seen timestamp (heartbeat). */
  public async touchLastSeen(userId: string): Promise<void> {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return;
    user.last_seen_at = new Date().toISOString();
    this.saveDB(db);
  }

  private isMentioned(content: string, user: User | undefined): boolean {
    if (!user) return false;
    const names = [user.full_name, user.full_name?.split(" ")[0]].filter(
      (n): n is string => Boolean(n)
    );
    const lower = content.toLowerCase();
    return names.some((name) => lower.includes(`@${name.toLowerCase()}`));
  }

  public async markConversationRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const db = this.getDB();
    this.upsertRead(db, conversationId, userId, new Date().toISOString());
    this.saveDB(db);
  }

  private upsertRead(
    db: DatabaseSchema,
    conversationId: string,
    userId: string,
    lastReadAt: string
  ) {
    const index = db.message_reads.findIndex(
      (r) => r.conversation_id === conversationId && r.user_id === userId
    );
    if (index === -1) {
      db.message_reads.push({
        id: `mr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: lastReadAt,
      });
    } else {
      db.message_reads[index].last_read_at = lastReadAt;
    }
  }

  public async getUnreadCountByConversation(
    conversationId: string,
    userId: string
  ): Promise<number> {
    const db = this.getDB();
    const conversation = db.conversations.find((c) => c.id === conversationId);
    if (!conversation) return 0;
    const members = db.conversation_members.filter(
      (m) => m.conversation_id === conversationId
    );
    return this.getUnreadCount(db, conversation, members, userId);
  }

  public async getUnreadMessageCount(userId: string): Promise<number> {
    const db = this.getDB();
    const memberships = db.conversation_members.filter((m) => m.user_id === userId);
    let total = 0;
    for (const membership of memberships) {
      const conversation = db.conversations.find(
        (c) => c.id === membership.conversation_id
      );
      if (!conversation) continue;
      const members = db.conversation_members.filter(
        (m) => m.conversation_id === conversation.id
      );
      total += this.getUnreadCount(db, conversation, members, userId);
    }
    return total;
  }

  // --- Notifications ---

  public async getNotifications(userId: string): Promise<NotificationWithActor[]> {
    const db = this.getDB();
    return db.notifications
      .filter((n) => n.user_id === userId)
      .map((n) => ({
        ...n,
        actor: n.actor_id
          ? db.users.find((u) => u.id === n.actor_id) ?? null
          : null,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.getDB().notifications.filter(
      (n) => n.user_id === userId && !n.is_read
    ).length;
  }

  public async createNotification(input: {
    user_id: string;
    actor_id?: string | null;
    type: string;
    content: string;
    related_link?: string | null;
  }): Promise<AppNotification | null> {
    const db = this.getDB();
    if (!db.users.some((u) => u.id === input.user_id)) return null;
    const notification = this.buildNotification({
      db,
      userId: input.user_id,
      actorId: input.actor_id ?? null,
      type: input.type,
      content: input.content,
      relatedLink: input.related_link ?? null,
      now: new Date().toISOString(),
    });
    db.notifications.push(notification);
    this.saveDB(db);
    return notification;
  }

  private buildNotification(params: {
    db: DatabaseSchema;
    userId: string;
    actorId: string | null;
    type: string;
    content: string;
    relatedLink: string | null;
    now: string;
  }): AppNotification {
    return {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      content: params.content,
      related_link: params.relatedLink,
      is_read: false,
      created_at: params.now,
    };
  }

  public async markNotificationRead(id: string): Promise<void> {
    const db = this.getDB();
    const notification = db.notifications.find((n) => n.id === id);
    if (!notification) return;
    notification.is_read = true;
    this.saveDB(db);
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    const db = this.getDB();
    let changed = false;
    db.notifications.forEach((n) => {
      if (n.user_id === userId && !n.is_read) {
        n.is_read = true;
        changed = true;
      }
    });
    if (changed) this.saveDB(db);
  }

  // --- Comments ---

  public async getComments(postId: string): Promise<PostCommentWithUser[]> {
    const db = this.getDB();
    return db.comments
      .filter((c) => c.post_id === postId)
      .map((c) => {
        const user = db.users.find((u) => u.id === c.author_id);
        return user ? { ...c, user } : null;
      })
      .filter((x): x is PostCommentWithUser => x !== null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  public async getCommentCount(postId: string): Promise<number> {
    return this.getDB().comments.filter((c) => c.post_id === postId && !c.deleted_at).length;
  }

  /**
   * Add a comment (or a reply when parentCommentId is given). Notifies the
   * post author for top-level comments, and the parent's author for replies.
   */
  public async createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentCommentId?: string | null;
  }): Promise<PostComment | null> {
    const db = this.getDB();
    const trimmed = input.content.trim();
    if (!trimmed) return null;

    const post = db.nearby_posts.find((p) => p.id === input.postId);
    if (!post) return null;

    const now = new Date().toISOString();
    const comment: PostComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      post_id: input.postId,
      author_id: input.authorId,
      parent_comment_id: input.parentCommentId ?? null,
      content: trimmed.slice(0, 2000),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    db.comments.push(comment);

    const author = db.users.find((u) => u.id === input.authorId);

    // Notify the right person — the post author, or the author of the comment
    // being replied to (never yourself).
    let notifyUserId: string | null = null;
    let type = "comment";
    if (input.parentCommentId) {
      const parent = db.comments.find((c) => c.id === input.parentCommentId);
      if (parent && parent.author_id !== input.authorId) {
        notifyUserId = parent.author_id;
        type = "reply";
      }
    } else if (post.user_id !== input.authorId) {
      notifyUserId = post.user_id;
    }

    if (notifyUserId && !this.isBlockedBetween(db, input.authorId, notifyUserId)) {
      db.notifications.push(
        this.buildNotification({
          db,
          userId: notifyUserId,
          actorId: input.authorId,
          type,
          content: trimmed.slice(0, 160),
          relatedLink: `/nearby/${input.postId}`,
          now,
        })
      );
    }

    this.saveDB(db);
    return comment;
  }

  public async updateComment(id: string, authorId: string, content: string): Promise<PostComment | null> {
    const db = this.getDB();
    const comment = db.comments.find((c) => c.id === id && c.author_id === authorId && !c.deleted_at);
    if (!comment) return null;
    comment.content = content.trim().slice(0, 2000);
    comment.updated_at = new Date().toISOString();
    this.saveDB(db);
    return comment;
  }

  /** Soft-delete a comment (keeps the row for thread context). */
  public async deleteComment(id: string, authorId: string): Promise<boolean> {
    const db = this.getDB();
    const comment = db.comments.find((c) => c.id === id && c.author_id === authorId && !c.deleted_at);
    if (!comment) return false;
    comment.deleted_at = new Date().toISOString();
    this.saveDB(db);
    return true;
  }

  // --- Reactions ---

  public async getReactions(postId: string): Promise<PostReaction[]> {
    return this.getDB().reactions.filter((r) => r.post_id === postId);
  }

  public async getReactionCount(postId: string): Promise<number> {
    return this.getDB().reactions.filter((r) => r.post_id === postId).length;
  }

  public async hasReacted(postId: string, userId: string): Promise<boolean> {
    return this.getDB().reactions.some(
      (r) => r.post_id === postId && r.user_id === userId
    );
  }

  /** Toggle a reaction; notifies the post author when first liked. */
  public async toggleReaction(
    postId: string,
    userId: string,
    reactionType = "like"
  ): Promise<{ reacted: boolean; count: number }> {
    const db = this.getDB();
    const post = db.nearby_posts.find((p) => p.id === postId);
    if (!post) return { reacted: false, count: 0 };

    const existingIndex = db.reactions.findIndex(
      (r) => r.post_id === postId && r.user_id === userId
    );

    if (existingIndex !== -1) {
      db.reactions.splice(existingIndex, 1);
    } else {
      db.reactions.push({
        id: `rx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
        created_at: new Date().toISOString(),
      });
      // Notify the author (never yourself, never blocked users).
      if (post.user_id !== userId && !this.isBlockedBetween(db, userId, post.user_id)) {
        const actor = db.users.find((u) => u.id === userId);
        db.notifications.push(
          this.buildNotification({
            db,
            userId: post.user_id,
            actorId: userId,
            type: "reaction",
            content: `${actor?.full_name || "A neighbour"} reacted to your post.`,
            relatedLink: `/nearby/${postId}`,
            now: new Date().toISOString(),
          })
        );
      }
    }

    this.saveDB(db);
    return {
      reacted: existingIndex === -1,
      count: db.reactions.filter((r) => r.post_id === postId).length,
    };
  }

  // --- Blocks ---

  public async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (!blockerId || !blockedId || blockerId === blockedId) return false;
    const db = this.getDB();
    if (db.blocks.some((b) => b.blocker_id === blockerId && b.blocked_id === blockedId)) {
      return true;
    }
    db.blocks.push({
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      blocker_id: blockerId,
      blocked_id: blockedId,
      created_at: new Date().toISOString(),
    });
    this.saveDB(db);
    return true;
  }

  public async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const db = this.getDB();
    const before = db.blocks.length;
    db.blocks = db.blocks.filter(
      (b) => !(b.blocker_id === blockerId && b.blocked_id === blockedId)
    );
    if (db.blocks.length !== before) this.saveDB(db);
    return db.blocks.length !== before;
  }

  public async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return this.isBlockedBetween(this.getDB(), blockerId, blockedId);
  }

  public async getBlockedUserIds(userId: string): Promise<string[]> {
    const db = this.getDB();
    const ids = new Set<string>();
    db.blocks.forEach((b) => {
      if (b.blocker_id === userId) ids.add(b.blocked_id);
      if (b.blocked_id === userId) ids.add(b.blocker_id);
    });
    return Array.from(ids);
  }

  /** True when either direction of a block exists between two users. */
  private isBlockedBetween(db: DatabaseSchema, a: string, b: string): boolean {
    return db.blocks.some(
      (blk) =>
        (blk.blocker_id === a && blk.blocked_id === b) ||
        (blk.blocker_id === b && blk.blocked_id === a)
    );
  }

  // --- Reports ---

  public async createReport(input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<Report | null> {
    const db = this.getDB();
    if (!db.users.some((u) => u.id === input.reporterId)) return null;
    const report: Report = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason.trim().slice(0, 200),
      description: input.description?.trim().slice(0, 2000) ?? "",
      status: "open",
      created_at: new Date().toISOString(),
    };
    db.reports.push(report);
    this.saveDB(db);
    return report;
  }

  // --- Help Requests ---
  public async getHelpRequests(): Promise<(HelpRequest & { user: User })[]> {
    const db = this.getDB();
    return db.help_requests
      .map((req) => {
        const user = db.users.find((u) => u.id === req.user_id)!;
        return { ...req, user };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async createHelpRequest(request: Omit<HelpRequest, "id" | "created_at" | "updated_at" | "status">): Promise<HelpRequest> {
    const db = this.getDB();
    const newRequest: HelpRequest = {
      ...request,
      id: `req_${Date.now()}`,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.help_requests.push(newRequest);
    this.saveDB(db);
    return newRequest;
  }
}

export const db = new LocalDatabase();
