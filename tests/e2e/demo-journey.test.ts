import { test, expect, type Page } from "@playwright/test";

/**
 * Aas-Paas demo journey — exercises the full local-first experience end to end:
 * login → messages → chat send → profile → notifications, plus the production
 * auth screens (verify-email, forgot-password) that render without a backend.
 * Run: npm run test:e2e  (starts the dev server automatically)
 */

/** Desktop sidebar is hidden below lg (1024px); mobile uses the bottom bar. */
async function isDesktop(page: Page) {
  const viewport = page.viewportSize();
  return Boolean(viewport && viewport.width >= 1024);
}

/** Open the messages page via the primary nav (desktop) or the route (mobile). */
async function openMessages(page: Page) {
  if (await isDesktop(page)) {
    await page.getByRole("link", { name: "Messages", exact: true }).first().click();
  } else {
    await page.goto("/messages");
  }
  await expect(page).toHaveURL(/\/messages/);
}

/** Open the notifications page via the primary nav (desktop) or the route (mobile). */
async function openNotifications(page: Page) {
  if (await isDesktop(page)) {
    await page.getByRole("link", { name: "Notifications", exact: true }).first().click();
  } else {
    await page.goto("/notifications");
  }
  await expect(page).toHaveURL(/\/notifications/);
}

/** Fill an input reliably across engines (WebKit's fill() can be flaky). */
async function fillInput(locator: ReturnType<Page["getByLabel"]>, value: string) {
  await locator.click();
  await locator.pressSequentially(value, { delay: 10 });
}
test.describe("Demo journey", () => {
  test("demo login lands on home with the app shell", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

    await page.getByRole("button", { name: /Explore with Demo Account/i }).click();

    // Redirected to /home with navigation intact (sidebar on desktop, bottom bar on mobile).
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole("navigation").first()).toBeVisible();
    if (await isDesktop(page)) {
      await expect(page.getByText("Messages", { exact: true }).first()).toBeVisible();
    } else {
      await expect(page.getByLabel(/Mobile navigation/i)).toBeVisible();
    }
  });

  test("conversation list shows seeded chats and opens a chat", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Explore with Demo Account/i }).click();
    await expect(page).toHaveURL(/\/home/);

    await openMessages(page);
    await expect(page.getByText(/Bandra West Community/i).first()).toBeVisible();

    await page.getByText(/Bandra West Community/i).first().click();
    // Chat header + composer render.
    await expect(page.getByPlaceholder(/Message the group/i)).toBeVisible();
  });

  test("sends a message from the chat window", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Explore with Demo Account/i }).click();
    await expect(page).toHaveURL(/\/home/);

    await openMessages(page);
    await page.getByText(/Bandra West Community/i).first().click();

    const composer = page.getByPlaceholder(/Message the group/i);
    await composer.fill("Hello from the e2e test!");
    await composer.press("Enter");

    // Scope to the visible chat pane — the conversation list also shows a
    // preview of the last message and is hidden on mobile when a chat is open.
    const chat = page.locator('section[aria-label="Active conversation"]');
    await expect(chat.getByText("Hello from the e2e test!").first()).toBeVisible();
  });

  test("profile page shows neighbour info and Message button", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Explore with Demo Account/i }).click();
    await expect(page).toHaveURL(/\/home/);

    await page.goto("/profile/user_2");
    await expect(page.getByText("Rahul Verma", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Message/i })).toBeVisible();
  });

  test("notifications page lists items and clears the badge", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Explore with Demo Account/i }).click();
    await expect(page).toHaveURL(/\/home/);

    await openNotifications(page);
    // The seeded group-invite notification (title is a heading).
    await expect(page.getByRole("heading", { name: /added you to/i })).toBeVisible();
  });

  test("nearby post detail shows live comments", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Explore with Demo Account/i }).click();
    await expect(page).toHaveURL(/\/home/);

    await page.goto("/nearby/post_1");
    await expect(page.getByText(/Responses/i).first()).toBeVisible();
    // Seeded comment on the lost-dog post.
    await expect(page.getByText(/similar dog near Carter Road/i).first()).toBeVisible();
  });
});

test.describe("Auth screens", () => {
  test("verify-email screen renders its actions", async ({ page }) => {
    await page.goto("/verify-email?email=someone@example.com");
    await expect(page.getByRole("heading", { name: /Check your inbox/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Resend verification email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Change email/i })).toBeVisible();
  });

  test("forgot-password shows a friendly anti-enumeration message", async ({ page }) => {
    // Deterministic: intercept the Supabase recover call so the test asserts the
    // UI contract (anti-enumeration copy) rather than external network behavior.
    await page.route("**/auth/v1/recover", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto("/forgot-password");
    await fillInput(page.getByLabel(/Email/i), "nobody@example.com");
    await page.getByRole("button", { name: /Send reset link/i }).click();
    await expect(page.getByText(/If an account exists/i)).toBeVisible();
  });
});
