export type ShareResult = "shared" | "copied" | "dismissed";

interface ShareInput {
  title: string;
  text: string;
  /** Route (e.g. "/posts/abc") or absolute URL. */
  url: string;
}

/**
 * Share via the native share sheet (phones, tablets, desktop browsers that
 * support it), falling back to copying "{text} — {url}" to the clipboard.
 */
export async function shareContent(input: ShareInput): Promise<ShareResult> {
  const fullUrl = input.url.startsWith("http")
    ? input.url
    : `${window.location.origin}${input.url}`;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: input.title, text: input.text, url: fullUrl });
      return "shared";
    } catch {
      return "dismissed"; // user closed the sheet
    }
  }

  try {
    await navigator.clipboard.writeText(`${input.text} — ${fullUrl}`);
    return "copied";
  } catch {
    return "copied";
  }
}
