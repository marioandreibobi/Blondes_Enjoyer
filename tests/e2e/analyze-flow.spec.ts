import { test, expect } from "@playwright/test";

test.describe("CodeAtlas — Smoke Test", () => {
  test("landing page loads with search bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("CodeAtlas");
    await expect(page.locator('input[type="url"]')).toBeVisible();
  });

  test("rejects invalid URL with error message", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="url"]');
    await input.fill("not-a-url");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=valid GitHub URL")).toBeVisible();
  });
});
