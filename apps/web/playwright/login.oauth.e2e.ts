import { IS_AUTHENTIK_LOGIN_ENABLED } from "@calcom/features/auth/lib/authentik";
import { expect, test } from "@playwright/test";
import { IS_GOOGLE_LOGIN_ENABLED } from "../server/lib/constants";

test("Should display Google Login button", async ({ page }) => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!IS_GOOGLE_LOGIN_ENABLED, "It should only run if Google Login is installed");

  await page.goto(`/auth/login`);

  await expect(page.locator(`[data-testid=google]`)).toBeVisible();
});

test("Should display Authentik Login button", async ({ page }) => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!IS_AUTHENTIK_LOGIN_ENABLED, "It should only run if Authentik login is configured");

  await page.goto(`/auth/login`);

  await expect(page.locator(`[data-testid=authentik]`)).toBeVisible();
});
