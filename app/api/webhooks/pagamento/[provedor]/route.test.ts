import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A sonda de validação abre uma porta antes da autenticação. Estes casos
 * existem para provar que ela é ESTREITA: responde "estou de pé" e não
 * aceita nada que mova dinheiro.
 */

const processarAviso = vi.fn();
vi.mock("@/lib/billing/webhook", () => ({ processarAviso }));
vi.mock("@/lib/billing/efi/config", () => ({
  lerConfigEfi: () => ({ ok: false, faltando: [], motivo: "sem credencial" }),
}));
vi.mock("@/lib/billing/efi/gateway", () => ({ EfiGateway: class {} }));

const { POST } = await import("./route");

function pedir(corpo: string, cabecalhos: Record<string, string> = {}) {
  return POST(
    new Request("https://exemplo.test/api/webhooks/pagamento/efi", {
      method: "POST",
      body: corpo,
      headers: cabecalhos,
    }),
    { params: Promise.resolve({ provedor: "efi" }) }
  );
}

beforeEach(() => {
  processarAviso.mockReset().mockResolvedValue({ acao: "quitou", status: 200 });
  vi.stubEnv("BILLING_WEBHOOK_SECRET", "a".repeat(32));
});

describe("sonda de validação", () => {
  it("corpo vazio responde 200 — é o que a EFI exige para registrar", async () => {
    const r = await pedir("");
    expect(r.status).toBe(200);
    expect(processarAviso).not.toHaveBeenCalled();
  });

  it("objeto vazio também", async () => {
    expect((await pedir("{}")).status).toBe(200);
    expect(processarAviso).not.toHaveBeenCalled();
  });

  it("corpo que não é JSON não derruba a rota", async () => {
    expect((await pedir("ping")).status).toBe(200);
    expect(processarAviso).not.toHaveBeenCalled();
  });
});

describe("a porta aberta NÃO deixa passar pagamento", () => {
  it("aviso de pagamento sem token continua sendo recusado", async () => {
    // É o ataque: aproveitar a sonda para mandar "pagou". O corpo é
    // reconhecível como aviso, então ele NÃO é sonda e cai na autenticação.
    const r = await pedir(
      JSON.stringify({ pix: [{ txid: "abc123", valor: "990.00" }] })
    );
    expect(r.status).toBe(401);
    expect(processarAviso).not.toHaveBeenCalled();
  });

  it("com o token certo, o aviso passa normalmente", async () => {
    const r = await pedir(
      JSON.stringify({ pix: [{ txid: "abc123", valor: "1.00" }] }),
      { authorization: `Bearer ${"a".repeat(32)}` }
    );
    expect(r.status).toBe(200);
    expect(processarAviso).toHaveBeenCalled();
  });
});

describe("provedor desconhecido", () => {
  it("não ganha sonda nem nada", async () => {
    const r = await POST(
      new Request("https://exemplo.test/x", { method: "POST", body: "" }),
      { params: Promise.resolve({ provedor: "inventado" }) }
    );
    expect(r.status).toBe(404);
  });
});
