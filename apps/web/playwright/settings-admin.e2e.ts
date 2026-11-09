import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Settings/admin tests", () => {
  test("should render /settings/admin page", async ({ page, users, context }) => {
    const user = await users.create({
      role: "ADMIN",
    });
    await user.apiLogin();

    const response = await page.goto("/settings/admin");
    expect(response?.status()).toBe(200);

    await page.waitForLoadState();

    const locator = page.getByRole("heading", { name: "Feature Flags" });

    await expect(locator).toBeVisible();
    expect((await page.reload())?.status()).toBe(200);
    await expect(locator).toBeVisible();
  });

  test("a USER receives 403 for admin and event-type pages on direct visits and reload", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();

    for (const path of ["/settings/admin", "/event-types"]) {
      expect((await page.goto(path))?.status(), `direct visit to ${path}`).toBe(403);
      expect((await page.reload())?.status(), `reload of ${path}`).toBe(403);
    }
  });
});
