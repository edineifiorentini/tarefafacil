import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Gate de acessibilidade com axe-core. Falha em qualquer violação WCAG 2.1 AA.
// Rotas autenticadas dependem de um fixture de sessão (a adicionar quando
// houver usuário de teste semeado — E18). Por ora, cobre a rota pública.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Acessibilidade (axe)", () => {
  test("login sem violações", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
