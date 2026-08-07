import { expect, test } from "@playwright/test";

// Fumaça — prova que a aplicação sobe e responde.
// Substituído por fluxos reais a partir das etapas de produto.
test("a home carrega", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
