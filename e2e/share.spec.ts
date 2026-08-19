import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Link público de demanda, ponta a ponta e sem login — que é justamente a
 * condição em que ele roda.
 *
 * Vale mais que teste de unidade aqui porque o risco desta função não está
 * numa conta, e sim na LIGAÇÃO entre banco, servidor e página: é exatamente
 * a classe de defeito que passou pelos 213 testes de unidade nas últimas
 * rodadas (relógio congelado, UTC contra local, link órfão).
 *
 * Os dados vivem num workspace descartável, apagado no fim. Nada encosta no
 * workspace real — apagar o workspace leva tudo junto por cascade.
 */

function env(): Record<string, string> {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [
        l.slice(0, l.indexOf("=")).trim(),
        l.slice(l.indexOf("=") + 1).trim(),
      ])
  );
}

function admin() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

type Cenario = {
  workspaceId: string;
  tokenAtivo: string;
  tokenRevogado: string;
  tokenExpirado: string;
};

let cenario: Cenario;

test.beforeAll(async () => {
  const db = admin();

  const { data: ws } = await db
    .from("workspace")
    .insert({ name: "E2E link público" })
    .select()
    .single();
  const { data: setor } = await db
    .from("sector")
    .insert({ workspace_id: ws!.id, name: "Comunicação", color: "#2563EB" })
    .select()
    .single();
  const { data: tarefa } = await db
    .from("task")
    .insert({
      workspace_id: ws!.id,
      sector_id: setor!.id,
      title: "Reformar a praça central",
      description: "Troca de bancos e iluminação.",
      priority: "alta",
      due_date: "2026-12-20",
    })
    .select()
    .single();
  await db.from("subtask").insert([
    { workspace_id: ws!.id, task_id: tarefa!.id, title: "Orçamento", position: 0, completed_at: new Date().toISOString() },
    { workspace_id: ws!.id, task_id: tarefa!.id, title: "Licitação", position: 1 },
  ]);

  const base = {
    workspace_id: ws!.id,
    entity_type: "task" as const,
    entity_id: tarefa!.id,
  };
  const { data: links } = await db
    .from("share_link")
    .insert([
      base,
      { ...base, revoked_at: new Date().toISOString() },
      { ...base, expires_at: new Date(Date.now() - 86_400_000).toISOString() },
    ])
    .select();

  cenario = {
    workspaceId: ws!.id,
    tokenAtivo: links![0].token,
    tokenRevogado: links![1].token,
    tokenExpirado: links![2].token,
  };
});

test.afterAll(async () => {
  if (cenario?.workspaceId) {
    await admin().from("workspace").delete().eq("id", cenario.workspaceId);
  }
});

test("link válido mostra a demanda para quem não tem conta", async ({
  page,
}) => {
  await page.goto(`/d/${cenario.tokenAtivo}`);

  await expect(
    page.getByRole("heading", { name: "Reformar a praça central" })
  ).toBeVisible();
  await expect(page.getByText("Troca de bancos e iluminação.")).toBeVisible();
  await expect(page.getByText("Comunicação")).toBeVisible();
  await expect(page.getByText("Em andamento")).toBeVisible();
  await expect(page.getByText("Prazo: 20/12/2026")).toBeVisible();
  // Etapas com o progresso somado.
  await expect(page.getByText("Etapas · 1 de 2")).toBeVisible();
  await expect(page.getByText("Licitação")).toBeVisible();
});

test("não vaza nada além do autorizado", async ({ page }) => {
  await page.goto(`/d/${cenario.tokenAtivo}`);
  const html = (await page.content()).toLowerCase();

  // O que a página NÃO pode conter, em nenhuma forma — nem em JSON de
  // hidratação, que é onde vazamento costuma se esconder.
  for (const proibido of [
    "supabase_secret",
    "sb_secret",
    "service_role",
    cenario.workspaceId.toLowerCase(),
  ]) {
    expect(html, `vazou "${proibido}"`).not.toContain(proibido);
  }

  // Nenhuma navegação para dentro do app.
  await expect(page.locator('a[href^="/dashboard"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/financeiro"]')).toHaveCount(0);
});

test("link revogado não mostra a demanda", async ({ page }) => {
  await page.goto(`/d/${cenario.tokenRevogado}`);
  await expect(page.getByText("Acompanhamento indisponível")).toBeVisible();
  await expect(page.getByText(/revogado/i)).toBeVisible();
  await expect(page.getByText("Reformar a praça central")).toHaveCount(0);
});

test("link expirado não mostra a demanda", async ({ page }) => {
  await page.goto(`/d/${cenario.tokenExpirado}`);
  await expect(page.getByText("Acompanhamento indisponível")).toBeVisible();
  await expect(page.getByText(/expirou/i)).toBeVisible();
  await expect(page.getByText("Reformar a praça central")).toHaveCount(0);
});

test("token inventado não revela se existe ou não", async ({ page }) => {
  await page.goto(`/d/${"a".repeat(64)}`);
  await expect(page.getByText("Acompanhamento indisponível")).toBeVisible();
});

test("a página pede para não ser indexada", async ({ page }) => {
  await page.goto(`/d/${cenario.tokenAtivo}`);
  // Sem isto, um buscador poderia indexar a demanda de um cliente.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/
  );
});

test("abrir o link conta a visita; revogado e expirado não contam", async ({
  page,
}) => {
  const db = admin();
  await page.goto(`/d/${cenario.tokenAtivo}`);
  await page.goto(`/d/${cenario.tokenRevogado}`);
  await page.goto(`/d/${cenario.tokenExpirado}`);

  const { data } = await db
    .from("share_link")
    .select("token, view_count")
    .eq("workspace_id", cenario.workspaceId);

  const porToken = new Map(data!.map((l) => [l.token, l.view_count]));
  expect(porToken.get(cenario.tokenAtivo)).toBeGreaterThan(0);
  expect(porToken.get(cenario.tokenRevogado)).toBe(0);
  expect(porToken.get(cenario.tokenExpirado)).toBe(0);
});
