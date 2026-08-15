/**
 * LocalPulse assistant — a friendly, data-aware helper.
 *
 * Ported from the old FastAPI /chat endpoint into the browser. No external AI
 * provider or secret is needed: the assistant answers from the platform's own
 * data (providers, live posts, open requests near the user) plus a small
 * knowledge base about how LocalPulse works.
 */
import { fetchProviders } from "@/features/directory/directoryApi";
import { fetchFeed } from "@/features/feed/feedApi";
import { fetchRequests } from "@/features/requests/requestsApi";
import type { ChatReply, FeedCategory, ProviderCategory, RequestType } from "@/types";

const DEFAULT_RADIUS_KM = 5;
const DEFAULT_CENTER = { lat: 19.0554, lng: 72.8326 }; // Bandra West — used when nothing else is known

const PROVIDER_KEYWORDS: Record<ProviderCategory, string[]> = {
  cook: ["cook", "chef", "meal", "food", "tiffin", "dinner", "lunch", "thali"],
  maid: ["maid", "house help", "cleaning", "cleaner", "housekeeping", "sweeper"],
  tutor: ["tutor", "tuition", "teacher", "coaching", "classes", "maths", "math", "science"],
  plumber: ["plumber", "plumbing", "leak", "tap", "pipe", "drain"],
  electrician: ["electrician", "electrical", "wiring", "fuse", "switch", "fan", "current"],
  dog_walker: ["dog", "pet", "walker", "walk"],
  other: [],
};

const REQUEST_KEYWORDS: Record<RequestType, string[]> = {
  borrow_lend: ["borrow", "lend", "ladder", "drill", "tool", "loan"],
  ride_share: ["ride", "lift", "airport", "car", "taxi", "pickup", "drop"],
  spare_item: ["ticket", "spare", "extra", "giveaway", "free"],
  other: [],
};

const POST_KEYWORDS: Record<FeedCategory, string[]> = {
  traffic: ["traffic", "jam", "congestion", "road", "accident", "diversion"],
  civic: ["road", "garbage", "street light", "pothole", "civic"],
  safety: ["police", "checkpoint", "safety", "suspicious", "theft"],
  utility: ["water", "power", "electricity", "outage", "supply", "wifi", "internet"],
  event: ["event", "meetup", "festival", "workshop", "movie", "party", "drive"],
  other: [],
};

function contains(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

function isGreeting(text: string): boolean {
  return /^\s*(hi|hello|hey|namaste|hola|yo|good\s*(morning|afternoon|evening))\b/i.test(text);
}

function isThanks(text: string): boolean {
  return /\b(thanks|thank you|thx|dhanyavad|shukriya)\b/i.test(text);
}

function howDoI(text: string): string | null {
  const lower = text.toLowerCase();
  if (contains(lower, ["post", "share an update", "create a post", "announce"])) {
    return (
      "To share a pulse: open the **Nearby** tab and tap the **What's happening in your area?** button. " +
      "Pick a category (traffic, civic, safety, utility, event), add a short note, and it goes live to " +
      "neighbours within a few kilometres. It auto-expires in 6–12 hours, keeping the feed fresh."
    );
  }
  if (contains(lower, ["verify", "verified", "badge"])) {
    return (
      "**Getting verified:**\n" +
      "• As a resident — add your phone number on your profile; we verify it with a one-time code.\n" +
      "• As a provider — complete the business profile and collect **3 text reviews** from neighbours " +
      "who actually used your service. The green verified badge appears automatically once you hit that."
    );
  }
  if (contains(lower, ["review", "rate", "star"])) {
    return (
      "You can review a provider from their profile page — hit **Write a review**. We require a short " +
      "text note alongside the star rating so reviews stay honest and helpful."
    );
  }
  if (contains(lower, ["request", "ask for help", "need it"])) {
    return (
      "Need something fast? Open the **Needs** tab and create a request — borrow/lend, ride share, " +
      "spare item, or other. Give it a 'needed by' time and neighbours nearby will reply in the thread."
    );
  }
  if (contains(lower, ["report", "abuse", "flag"])) {
    return (
      "Every post, request and provider has a **Report** button. Tap it, pick a reason, and it goes " +
      "straight to the moderation queue — the community team reviews it."
    );
  }
  if (contains(lower, ["chat", "message", "dm"])) {
    return (
      "You can message any neighbour directly from a post or request — hit the **Message** button. " +
      "Your conversations live in the inbox (the chat icon at the top of the app)."
    );
  }
  if (contains(lower, ["book", "hire", "contact", "service"])) {
    return (
      "From any provider's profile, tap **Request service**, add a short note about what you need, " +
      "and the provider gets it in their bookings. When they accept, you can chat directly with them."
    );
  }
  return null;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m away`;
  return `${(m / 1000).toFixed(1)}km away`;
}

async function findProviders(category: ProviderCategory | null, lat: number, lng: number, limit = 3): Promise<string[]> {
  const providers = await fetchProviders({ lat, lng, radiusKm: DEFAULT_RADIUS_KM, category });
  return providers.slice(0, limit).map((p) => {
    const near = p.distance_m != null ? formatDistance(p.distance_m) : "nearby";
    const trust = p.verified ? `Verified by ${p.verification_count} neighbours` : `${p.review_count} review(s)`;
    return `• **${p.display_name}** — ${p.tagline} · ${near} · ${trust}`;
  });
}

async function findPosts(category: FeedCategory | null, lat: number, lng: number, limit = 3): Promise<string[]> {
  const posts = await fetchFeed({ lat, lng, radiusKm: DEFAULT_RADIUS_KM, category });
  return posts.slice(0, limit).map((p) => `• **${p.text.slice(0, 110)}**`);
}

async function findRequests(reqType: RequestType | null, lat: number, lng: number, limit = 2): Promise<string[]> {
  const requests = await fetchRequests({ lat, lng, radiusKm: DEFAULT_RADIUS_KM, type: reqType, status: "open" });
  return requests.slice(0, limit).map((r) => `• **${r.text.slice(0, 110)}**`);
}

const SUGGESTIONS: Record<string, string[]> = {
  provider: ["Verified only", "Show me cooks instead", "How do providers get verified?"],
  request: ["Post a request myself", "What's happening nearby?"],
  posts: ["Is the water supply affected?", "Show all nearby posts", "Post an update"],
  generic: ["Find a plumber near me", "What's happening nearby?", "How do I get verified?"],
};

export async function askAssistant(message: string, lat?: number, lng?: number): Promise<ChatReply> {
  const text = message.trim();
  const center = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER;
  const { lat: cLat, lng: cLng } = center;

  if (isThanks(text)) {
    return {
      reply: "Anytime! 🙌 That's what neighbours are for. Ping me whenever you need something nearby.",
      suggestions: ["Find a plumber near me", "What's happening right now?", "How do I get verified?"],
    };
  }

  if (isGreeting(text)) {
    return {
      reply: `Namaste! 👋 I'm the LocalPulse helper. I can find **providers nearby**, show you **what's happening right now**, surface **open requests**, or explain how anything works. What do you need?`,
      suggestions: ["Find a plumber near me", "What's happening nearby?", "Borrow a ladder nearby"],
    };
  }

  const kb = howDoI(text);
  if (kb !== null) {
    return { reply: kb, suggestions: ["Find a provider near me", "What's happening right now?", "Ask for help — borrow something"] };
  }

  // Provider intents
  for (const [category, words] of Object.entries(PROVIDER_KEYWORDS) as Array<[ProviderCategory, string[]]>) {
    if (contains(text, words)) {
      const providers = await findProviders(category, cLat, cLng);
      if (providers.length > 0) {
        const label = category.replace("_", " ");
        return {
          reply: `I found **${providers.length} ${label}** within ${DEFAULT_RADIUS_KM} km of you:\n\n${providers.join("\n")}`,
          suggestions: SUGGESTIONS.provider,
        };
      }
      return {
        reply: `I couldn't find a ${category.replace("_", " ")} within ${DEFAULT_RADIUS_KM} km right now. Try widening the area on the **Help** tab, or check back later — new providers sign up often.`,
        suggestions: ["Show all providers near me", "How do I become a provider?"],
      };
    }
  }

  // Request-board intents
  for (const [reqType, words] of Object.entries(REQUEST_KEYWORDS) as Array<[RequestType, string[]]>) {
    if (contains(text, words)) {
      const requests = await findRequests(reqType, cLat, cLng);
      if (requests.length > 0) {
        return {
          reply: `Here are open **${reqType.replace("_", " / ")}** requests near you:\n\n${requests.join("\n")}`,
          suggestions: SUGGESTIONS.request,
        };
      }
      return {
        reply: `No open ${reqType.replace("_", " / ")} requests nearby right now. You can create one on the **Needs** tab in a few seconds.`,
        suggestions: ["Create a request", "Find a provider near me"],
      };
    }
  }

  // Live-post intents
  for (const [category, words] of Object.entries(POST_KEYWORDS) as Array<[FeedCategory, string[]]>) {
    if (contains(text, words)) {
      const posts = await findPosts(category, cLat, cLng);
      if (posts.length > 0) {
        return {
          reply: `Here's what neighbours are reporting right now:\n\n${posts.join("\n")}`,
          suggestions: SUGGESTIONS.posts,
        };
      }
      return {
        reply: `Nothing about **${category}** nearby right now — all clear. If you're seeing something, post it on the **Nearby** tab so neighbours know!`,
        suggestions: ["Post a pulse", "What's happening nearby?"],
      };
    }
  }

  // Generic "show me" intents
  if (contains(text, ["all providers", "providers near", "who's near", "service provider", "help near", "show providers", "someone who"])) {
    const providers = await findProviders(null, cLat, cLng, 4);
    if (providers.length > 0) {
      return {
        reply: `Here are trusted providers near you:\n\n${providers.join("\n")}`,
        suggestions: ["Verified only", "Find a tutor", "How do I get verified?"],
      };
    }
    return {
      reply: "No providers found within a few kilometres yet. Check the **Help** tab or come back soon!",
      suggestions: ["How do providers get verified?", "Find a plumber near me"],
    };
  }

  if (contains(text, ["happening", "nearby now", "any news", "updates", "what's up", "live feed", "pulse"])) {
    const posts = await findPosts(null, cLat, cLng, 4);
    if (posts.length > 0) {
      return {
        reply: `Right now in your area:\n\n${posts.join("\n")}`,
        suggestions: ["Is the water supply affected?", "Show open requests", "Post an update"],
      };
    }
    return {
      reply: "Nothing reported nearby right now — a quiet neighbourhood! 🌿 Check the **Nearby** tab to see everything live.",
      suggestions: ["Post a pulse", "Find a provider near me"],
    };
  }

  if (contains(text, ["open request", "needs", "anyone asking", "help wanted", "borrow", "ask for"])) {
    const requests = await findRequests(null, cLat, cLng, 3);
    if (requests.length > 0) {
      return {
        reply: `Neighbours currently asking for help:\n\n${requests.join("\n")}`,
        suggestions: ["Offer to help", "Find a provider near me"],
      };
    }
    return {
      reply: "No open requests nearby right now. You can post one on the **Needs** tab.",
      suggestions: ["Create a request", "What's happening nearby?"],
    };
  }

  // Fallback
  return {
    reply:
      "I can help with things like:\n\n" +
      "• **\"Find a plumber near me\"** — providers nearby\n" +
      "• **\"What's happening nearby?\"** — live posts in your area\n" +
      "• **\"Borrow a ladder\"** — open requests\n" +
      "• **\"How do I get verified?\"** / **\"How do I post?\"** — how the platform works\n\n" +
      "Try one of those, or tap a suggestion below.",
    suggestions: SUGGESTIONS.generic,
  };
}
