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
  PostComment,
  PostReaction,
} from "./types";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const minutesAgo = (m: number) => new Date(Date.now() - m * MIN).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString();

export const MOCK_USERS: User[] = [
  {
    id: "user_1",
    email: "priya.sharma@example.com",
    full_name: "Priya Sharma",
    avatar_url: "",
    bio: "Love helping out in the neighbourhood. Baking enthusiast.",
    neighbourhood: "Bandra West",
    location_radius: 5,
    neighbour_score: 120,
    last_seen_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "user_2",
    email: "rahul.verma@example.com",
    full_name: "Rahul Verma",
    avatar_url: "",
    bio: "Electrician by profession. Happy to help with minor fixes.",
    neighbourhood: "Andheri East",
    location_radius: 10,
    neighbour_score: 350,
    last_seen_at: new Date(Date.now() - 45 * MIN).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "user_3",
    email: "anita.desai@example.com",
    full_name: "Anita Desai",
    avatar_url: "",
    bio: "Community garden volunteer. I organise the Sunday clean-ups in Bandra West.",
    neighbourhood: "Bandra West",
    location_radius: 5,
    neighbour_score: 210,
    created_at: new Date(Date.now() - 45 * DAY).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "user_demo",
    email: "demo@aaspaas.community",
    full_name: "Aas-Paas Demo",
    avatar_url: "",
    bio: "This is the demo neighbourhood account. Sign in to explore messaging, profiles and notifications.",
    neighbourhood: "Bandra West",
    location_radius: 5,
    neighbour_score: 80,
    created_at: new Date(Date.now() - 7 * DAY).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    type: "direct",
    name: null,
    avatar_url: null,
    created_by: "user_1",
    created_at: hoursAgo(4),
    updated_at: hoursAgo(1.5),
  },
  {
    id: "conv_2",
    type: "group",
    name: "Bandra West Community",
    avatar_url: "",
    created_by: "user_1",
    created_at: daysAgo(12),
    updated_at: minutesAgo(30),
  },
];

export const MOCK_CONVERSATION_MEMBERS: ConversationMember[] = [
  {
    id: "cm_1",
    conversation_id: "conv_1",
    user_id: "user_1",
    role: "owner",
    joined_at: hoursAgo(4),
  },
  {
    id: "cm_2",
    conversation_id: "conv_1",
    user_id: "user_2",
    role: "member",
    joined_at: hoursAgo(4),
  },
  {
    id: "cm_3",
    conversation_id: "conv_2",
    user_id: "user_1",
    role: "owner",
    joined_at: daysAgo(12),
  },
  {
    id: "cm_4",
    conversation_id: "conv_2",
    user_id: "user_2",
    role: "member",
    joined_at: daysAgo(12),
  },
  {
    id: "cm_5",
    conversation_id: "conv_2",
    user_id: "user_3",
    role: "admin",
    joined_at: daysAgo(10),
  },
  {
    id: "cm_6",
    conversation_id: "conv_2",
    user_id: "user_demo",
    role: "member",
    joined_at: daysAgo(5),
  },
];

export const MOCK_MESSAGES: Message[] = [
  // Direct conversation between Priya (user_1) and Rahul (user_2)
  {
    id: "msg_1",
    conversation_id: "conv_1",
    sender_id: "user_2",
    content: "Hey Priya! Saw your lost dog post — I might have spotted a similar one near Carter Road this morning.",
    created_at: hoursAgo(3),
  },
  {
    id: "msg_2",
    conversation_id: "conv_1",
    sender_id: "user_1",
    content: "Oh really? Do you remember roughly what time?",
    created_at: hoursAgo(2.5),
  },
  {
    id: "msg_3",
    conversation_id: "conv_1",
    sender_id: "user_2",
    content: "Around 9 AM, near the water tank. Red collar, right?",
    created_at: hoursAgo(2),
  },
  {
    id: "msg_4",
    conversation_id: "conv_1",
    sender_id: "user_1",
    content: "Yes! That sounds like her. Thank you so much, Rahul 🙏",
    created_at: hoursAgo(1.5),
  },
  // Bandra West Community group
  {
    id: "msg_5",
    conversation_id: "conv_2",
    sender_id: "user_3",
    content: "Reminder: community garden clean-up this Sunday at 8 AM near the clubhouse.",
    created_at: daysAgo(1),
  },
  {
    id: "msg_6",
    conversation_id: "conv_2",
    sender_id: "user_2",
    content: "I'll be there. Should I bring my own gloves?",
    created_at: hoursAgo(23),
  },
  {
    id: "msg_7",
    conversation_id: "conv_2",
    sender_id: "user_3",
    content: "Yes please! The society is arranging the bags and water.",
    created_at: hoursAgo(5),
  },
  {
    id: "msg_8",
    conversation_id: "conv_2",
    sender_id: "user_3",
    content: "@Priya could you confirm if you can make it on Sunday?",
    created_at: hoursAgo(2),
  },
  {
    id: "msg_9",
    conversation_id: "conv_2",
    sender_id: "user_2",
    content: "I can bring the water cans 🚰",
    created_at: minutesAgo(30),
  },
];

export const MOCK_MESSAGE_READS: MessageRead[] = [
  {
    id: "mr_1",
    conversation_id: "conv_1",
    user_id: "user_1",
    last_read_at: hoursAgo(1),
  },
  {
    id: "mr_2",
    conversation_id: "conv_1",
    user_id: "user_2",
    last_read_at: hoursAgo(1.4),
  },
  {
    id: "mr_3",
    conversation_id: "conv_2",
    user_id: "user_1",
    last_read_at: hoursAgo(5),
  },
  {
    id: "mr_4",
    conversation_id: "conv_2",
    user_id: "user_2",
    last_read_at: minutesAgo(30),
  },
  {
    id: "mr_5",
    conversation_id: "conv_2",
    user_id: "user_3",
    last_read_at: minutesAgo(29),
  },
  {
    id: "mr_6",
    conversation_id: "conv_2",
    user_id: "user_demo",
    last_read_at: hoursAgo(5),
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf_1",
    user_id: "user_1",
    actor_id: "user_2",
    type: "message",
    content: "Hey Priya! Saw your lost dog post — I might have spotted a similar one near Carter Road this morning.",
    related_link: "/messages?c=conv_1",
    is_read: false,
    created_at: hoursAgo(3),
  },
  {
    id: "ntf_2",
    user_id: "user_1",
    actor_id: "user_3",
    type: "mention",
    content: "@Priya could you confirm if you can make it on Sunday?",
    related_link: "/messages?c=conv_2",
    is_read: false,
    created_at: hoursAgo(2),
  },
  {
    id: "ntf_3",
    user_id: "user_1",
    actor_id: null,
    type: "system",
    content: "Welcome to Aas-Paas. Complete your profile to get discovered by neighbours.",
    related_link: "/profile",
    is_read: true,
    created_at: daysAgo(7),
  },
  {
    id: "ntf_4",
    user_id: "user_demo",
    actor_id: "user_1",
    type: "group_invite",
    content: "Priya Sharma added you to Bandra West Community.",
    related_link: "/messages?c=conv_2",
    is_read: false,
    created_at: daysAgo(5),
  },
  {
    id: "ntf_5",
    user_id: "user_demo",
    actor_id: "user_2",
    type: "message",
    content: "I can bring the water cans 🚰",
    related_link: "/messages?c=conv_2",
    is_read: false,
    created_at: minutesAgo(30),
  },
];

export const MOCK_NEARBY_POSTS: NearbyPost[] = [
  {
    id: "post_1",
    user_id: "user_1",
    content: "Has anyone seen a small brown indie dog near Carter Road? Wearing a red collar.",
    category: "Lost & Found",
    images: [],
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post_2",
    user_id: "user_2",
    content: "Water supply will be cut off tomorrow between 10 AM and 2 PM due to maintenance.",
    category: "Alert",
    images: [],
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  }
];

export const MOCK_HELP_PROFILES: HelpProfile[] = [
  {
    id: "help_1",
    user_id: "user_2",
    category: "Electrical",
    description: "I can fix fans, lights, and minor wiring issues for free on weekends.",
    is_verified: true,
    rating: 4.8,
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const MOCK_COMMENTS: PostComment[] = [
  {
    id: "cmt_1",
    post_id: "post_1",
    author_id: "user_2",
    parent_comment_id: null,
    content: "I think I saw a similar dog near Carter Road this morning around 9 AM.",
    created_at: hoursAgo(1.5),
    updated_at: hoursAgo(1.5),
    deleted_at: null,
  },
  {
    id: "cmt_2",
    post_id: "post_1",
    author_id: "user_3",
    parent_comment_id: null,
    content: "Shared in the society WhatsApp group. Hope you find her soon! 🙏",
    created_at: hoursAgo(1),
    updated_at: hoursAgo(1),
    deleted_at: null,
  },
  {
    id: "cmt_3",
    post_id: "post_1",
    author_id: "user_1",
    parent_comment_id: "cmt_1",
    content: "Thank you Rahul! Was it wearing a red collar?",
    created_at: minutesAgo(45),
    updated_at: minutesAgo(45),
    deleted_at: null,
  },
  {
    id: "cmt_4",
    post_id: "post_2",
    author_id: "user_3",
    parent_comment_id: null,
    content: "Thanks for the heads-up — will fill up buckets tonight.",
    created_at: hoursAgo(4),
    updated_at: hoursAgo(4),
    deleted_at: null,
  },
];

export const MOCK_REACTIONS: PostReaction[] = [
  { id: "rx_1", post_id: "post_1", user_id: "user_2", reaction_type: "like", created_at: hoursAgo(1.4) },
  { id: "rx_2", post_id: "post_1", user_id: "user_3", reaction_type: "like", created_at: hoursAgo(1.2) },
  { id: "rx_3", post_id: "post_2", user_id: "user_1", reaction_type: "like", created_at: hoursAgo(4) },
  { id: "rx_4", post_id: "post_2", user_id: "user_3", reaction_type: "like", created_at: hoursAgo(3.5) },
];

export const MOCK_HELP_REQUESTS: HelpRequest[] = [
  {
    id: "req_1",
    user_id: "user_1",
    title: "Need a ladder for 1 hour",
    description: "I need to clean my overhead fan. Does anyone have a 6ft ladder I can borrow today?",
    category: "Tools",
    status: "open",
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  }
];
