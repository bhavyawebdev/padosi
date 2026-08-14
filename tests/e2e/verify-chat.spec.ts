import { test, expect, type Page } from "@playwright/test";

/** Open messages via the route (works on both desktop and mobile). */
async function demoLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Explore with Demo Account/i }).click();
  await expect(page).toHaveURL(/\/home/);
}

test.describe("Chat feature verification", () => {
  test("Inbox/Archived tabs render and archiving moves the conversation", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/messages");

    // Inbox + Archived tabs exist.
    await expect(page.getByRole("button", { name: /Inbox/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Archived/i })).toBeVisible();

    // Open the group chat.
    await page.getByText(/Bandra West Community/i).first().click();
    await expect(page.getByPlaceholder(/Message the group/i)).toBeVisible();

    // Archive toggle exists in the header.
    await expect(page.getByRole("button", { name: /Archive conversation/i })).toBeVisible();

    // Send a message first so the conversation has activity.
    const composer = page.getByPlaceholder(/Message the group/i);
    await composer.fill("Archive verification message");
    await composer.press("Enter");
    const chat = page.locator('section[aria-label="Active conversation"]');
    await expect(chat.getByText("Archive verification message").first()).toBeVisible();

    // Archive → returns to the list.
    await page.getByRole("button", { name: /Archive conversation/i }).click();
    await expect(page).toHaveURL(/\/messages$/);

    // Conversation gone from Inbox.
    await expect(page.getByText(/Bandra West Community/i)).toHaveCount(0);

    // Archived tab now shows it (as a button/link to restore).
    await page.getByRole("button", { name: /Archived/i }).click();
    await expect(page.getByText(/Bandra West Community/i).first()).toBeVisible();
  });

  test("typing indicator appears and clears", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/messages?c=conv_2");

    // No indicator before any typing activity.
    await expect(page.getByText(/is typing/i)).toHaveCount(0);

    // Wait for React hydration so the ChatWindow's BroadcastChannel listener is live.
    await expect(page.getByPlaceholder(/Message the group/i)).toBeVisible();

    // Simulate a peer (user_2) typing in conv_2 over the typing BroadcastChannel,
    // exactly as the real transport delivers it. Own-user events are filtered by
    // the hook, so this must be a different user id.
    await page.evaluate(() => {
      const channel = new BroadcastChannel("aas-paas:typing");
      channel.postMessage({
        conversationId: "conv_2",
        userId: "user_2",
        name: "Rahul Verma",
        at: Date.now(),
      });
      setTimeout(() => channel.close(), 100);
    });

    // The typing label appears in the chat header.
    await expect(page.getByText(/Rahul Verma is typing/i)).toBeVisible({ timeout: 5000 });

    // The indicator clears after the 3s silence window.
    await expect(page.getByText(/is typing/i)).not.toBeVisible({ timeout: 6000 });
  });
});
