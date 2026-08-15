/**
 * Error helpers — every Supabase call goes through here so the UI never sees
 * raw database errors. Technical detail is logged; users get a safe message.
 */

/** The error type components already know how to render. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const FRIENDLY: Record<string, string> = {
  "not authenticated": "Please sign in and try again.",
  "forbidden": "You don't have permission to do that.",
  "only admins may change role or verification flags": "You don't have permission to do that.",
  "conversation not found": "This conversation is private or no longer exists.",
  "cannot start a conversation with yourself": "You can't message yourself.",
  "cannot message yourself": "You can't message yourself.",
  "user not found": "That person isn't on Padosi anymore.",
  "post not found": "That update has expired or been removed.",
  "provider not found": "This provider profile was removed.",
  "request not found": "This request no longer exists.",
  "booking not found": "That booking request no longer exists.",
  "report not found": "That report no longer exists.",
  "this request is closed": "This request is already closed.",
  "only the provider can respond": "Only the provider can respond to a booking.",
  "only the requester can mark this fulfilled": "Only the person who posted can mark it fulfilled.",
  "only the author can resolve this post": "Only the author can resolve this post.",
  "this post is outside your society's area": "This post is outside your society's area.",
  "no locality assigned": "Your community account needs a locality assigned.",
  "invalid action": "That action isn't recognised.",
};

function safeMessage(raw: string): string {
  const trimmed = raw.trim();
  if (FRIENDLY[trimmed]) return FRIENDLY[trimmed];
  // Postgres constraint/internal noise is never shown verbatim.
  if (trimmed.includes("duplicate key")) return "That already exists.";
  if (trimmed.includes("violates")) return "That change isn't allowed.";
  return "Something went wrong. Try again.";
}

/** Normalise any thrown value (Supabase error, network error) into ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const code = typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code ?? "")
    : "";
  const message = typeof err === "object" && err !== null && "message" in err
    ? String((err as { message?: unknown }).message ?? "")
    : "";

  // Auth API errors carry a status (400/401/422…) with a message like
  // "Invalid login credentials".
  const status = typeof err === "object" && err !== null && "status" in err
    ? Number((err as { status?: unknown }).status ?? 0)
    : 0;

  if (code === "42501" || /permission denied|row-level security/i.test(message)) {
    return new ApiError(403, "You don't have permission to do that.");
  }
  if (code === "23505" || /duplicate key/i.test(message)) {
    return new ApiError(409, "That already exists.");
  }
  // Email confirmation is on: the account exists but can't sign in yet.
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return new ApiError(400, "Your email hasn't been verified yet. Check your inbox for the confirmation link, then sign in.");
  }
  if (status >= 400 && status < 500 && message) {
    // Auth errors are already user-facing (e.g. "Invalid login credentials").
    return new ApiError(status, message);
  }
  if (/Invalid login credentials/i.test(message)) {
    return new ApiError(401, "Invalid email or password.");
  }
  if (code === "0" && !message) {
    return new ApiError(0, "Network error — check your connection and try again.");
  }
  return new ApiError(status || 400, safeMessage(message));
}

/** Helper for throwing an ApiError from a rejected Supabase call. */
export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw toApiError(result.error);
  return result.data;
}
