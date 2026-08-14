import "server-only";

/**
 * src/lib/email/index.ts — transactional email abstraction (SERVER ONLY)
 *
 * DESIGN: Supabase Auth remains the single authority for authentication
 * emails (verification, password reset, email change) — we never duplicate
 * those. This module covers *product* emails (welcome, security alerts) with
 * a swappable provider:
 *
 *   EMAIL_PROVIDER=noop          (default; logs instead of sending)
 *   EMAIL_PROVIDER=resend        (requires RESEND_API_KEY)
 *   EMAIL_PROVIDER=http          (requires EMAIL_API_URL + EMAIL_API_KEY;
 *                                 POSTs JSON { to, subject, html } with a
 *                                 Bearer token)
 *
 * All functions are fire-and-forget and never throw to the caller.
 */

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailProvider {
  send(payload: EmailPayload): Promise<boolean>;
}

function normalize(to: string): string {
  return to.trim().toLowerCase();
}

/** Default provider: logs the intent, does not send. Safe by default. */
class NoopProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<boolean> {
    console.info(
      `[email:noop] to=${payload.to} subject="${payload.subject}" (configure EMAIL_PROVIDER to send)`
    );
    return true;
  }
}

/** Simple HTTP provider: POST JSON to EMAIL_API_URL with a Bearer key. */
class HttpProvider implements EmailProvider {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  async send(payload: EmailPayload): Promise<boolean> {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`Aas-Paas: email provider returned ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Aas-Paas: email provider unavailable", err);
      return false;
    }
  }
}

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.EMAIL_PROVIDER ?? "noop";
  if (provider === "http") {
    const url = process.env.EMAIL_API_URL;
    const key = process.env.EMAIL_API_KEY;
    cachedProvider = url && key ? new HttpProvider(url, key) : new NoopProvider();
  } else {
    cachedProvider = new NoopProvider();
  }
  return cachedProvider;
}

async function deliver(payload: EmailPayload): Promise<boolean> {
  return getEmailProvider().send(payload);
}

/** Welcome email after a new account is verified. */
export async function sendWelcomeEmail(to: string, fullName: string): Promise<boolean> {
  return deliver({
    to: normalize(to),
    subject: "Welcome to Aas-Paas 🏘️",
    text: `Hi ${fullName},\n\nWelcome to Aas-Paas — your neighbourhood network. Post updates, request verified help, and connect with people nearby.\n\nThe Aas-Paas team`,
    html: `<p>Hi <strong>${fullName}</strong>,</p><p>Welcome to Aas-Paas — your neighbourhood network. Post updates, request verified help, and connect with people nearby.</p><p>The Aas-Paas team</p>`,
  });
}

/** Security alert (e.g. account restored after suspension). */
export async function sendSecurityEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  return deliver({
    to: normalize(to),
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
  });
}


