import "server-only";

/**
 * src/lib/email-validation/index.ts — signup email validation (SERVER ONLY)
 *
 * Rules:
 * - Never import from client code; the private API key never reaches the browser.
 * - Syntax validation + disposable-domain detection run locally (always work,
 *   no network, no cost).
 * - An optional external validation provider can be enabled with env vars:
 *     EMAIL_VALIDATION_API_URL + EMAIL_VALIDATION_API_KEY
 * - On provider failure the policy is fail-open (default) so legitimate users
 *   are never blocked by an outage. Set EMAIL_VALIDATION_FAIL_OPEN=false to
 *   fail closed instead.
 *
 * Provider contract (POST JSON { email }, expects 200 + JSON { valid: boolean }):
 *   ZeroBounce (https://www.zerobounce.net) is a production-suitable provider
 *   with a free tier, HTTPS, and disposable/MX validation. See docs/data-model
 *   and the .env.example comments for wiring.
 */

import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email()
  .refine((e) => !e.includes(".."), { message: "invalid domain" });

export type EmailValidationResult = {
  valid: boolean;
  reason?: "syntax" | "disposable" | "provider-rejected";
  normalizedEmail?: string;
};

/**
 * Curated list of well-known disposable / temporary email domains. Keeping it
 * server-side means the whole list isn't shipped to the browser.
 */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "grr.la",
  "10minutemail.com",
  "10minutemail.net",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "throwawaymail.com",
  "throwaway.xyz",
  "trashmail.com",
  "trashmail.de",
  "yopmail.com",
  "yopmail.fr",
  "sharklasers.com",
  "spam4.me",
  "mytemp.email",
  "tempemail.net",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "mintemail.com",
  "spambox.us",
  "getairmail.com",
  "getnada.com",
  "nada.email",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "fakemail.net",
  "mailtemp.net",
  "mohmal.com",
  "mohmal.in",
  "tmail.ws",
  "tmailor.com",
  "mail-temp.com",
  "tmpmail.org",
  "tmpmail.net",
  "0-mail.com",
  "0-mail.net",
  "0mmo.net",
  "1mail.ml",
  "33mail.com",
  "emailtemporario.com.br",
  "jetable.org",
  "mailmetrash.com",
  "mailexpire.com",
  "moakt.com",
  "norajin.com",
  "sogetthis.com",
  "soodonims.com",
  "spambob.com",
  "spamgourmet.com",
  "tmailinator.com",
  "veryrealemail.com",
  "zippymail.info",
  "emltmp.com",
  "mail1a.de",
  "fakemailgenerator.com",
  "mailinator2.com",
  "discard.email",
  "discardmail.com",
  "nullboxx.com",
  "inboxbear.com",
  "emailfake.com",
  "emailtemporario.com",
  "obeyinbox.com",
  "mailux.net",
  "1secmail.com",
  "1secmail.net",
  "1secmail.org",
]);

function isDisposable(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

async function callProvider(email: string): Promise<boolean | null> {
  const apiUrl = process.env.EMAIL_VALIDATION_API_URL;
  const apiKey = process.env.EMAIL_VALIDATION_API_KEY;
  if (!apiUrl || !apiKey) return null; // provider not configured

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error("Aas-Paas: email validation provider returned", res.status);
      return null;
    }
    const body = (await res.json()) as { valid?: boolean };
    return typeof body.valid === "boolean" ? body.valid : null;
  } catch (err) {
    // Fail-open on provider outages — never block signups because of us.
    console.error("Aas-Paas: email validation provider unavailable", err);
    return null;
  }
}

/**
 * Validate an email address for signup. Fails open when the optional external
 * provider is unreachable or not configured.
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const normalized = email.trim().toLowerCase();

  const parsed = emailSchema.safeParse(normalized);
  if (!parsed.success) {
    return { valid: false, reason: "syntax", normalizedEmail: normalized };
  }
  if (isDisposable(normalized)) {
    return { valid: false, reason: "disposable", normalizedEmail: normalized };
  }

  const failOpen = process.env.EMAIL_VALIDATION_FAIL_OPEN !== "false";
  const providerVerdict = await callProvider(normalized);

  if (providerVerdict === false) {
    return { valid: false, reason: "provider-rejected", normalizedEmail: normalized };
  }
  if (providerVerdict === null && !failOpen) {
    return { valid: false, reason: "provider-rejected", normalizedEmail: normalized };
  }

  return { valid: true, normalizedEmail: normalized };
}
