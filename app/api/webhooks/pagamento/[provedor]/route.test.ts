import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A sonda de validação abre uma porta antes da autenticação. Estes casos
 * existem para provar que ela é ESTREITA: responde "estou de pé" e não
 * aceita nada que mova dinheiro.
 */

const processarAviso = vi.fn();
vi.mock("@/lib/billing/webhook", () => ({ processarAviso }));
const configOk = vi.hoisted(() => ({ tem: true }));
vi.mock("@/lib/billing/efi/config", () => ({
  lerConfigEfi: () =>
    configOk.tem
      ? { ok: true, config: { ambiente: "homologacao" } }
      : { ok: false, faltando: [], motivo: "sem credencial" },
}));
vi.mock("@/lib/billing/efi/gateway", () => ({
  EfiGateway: class {
    async getChargeStatus() {
      return { paid: true, paidAt: new Date(), paidAmountCents: 100 };
    }
  },
}));

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
  configOk.tem = true;
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
  it("aviso de pagamento NÃO é tratado como sonda", async () => {
    // É o ataque: aproveitar a porta da sonda para mandar "pagou". O corpo é
    // reconhecível como aviso, então ele não é sonda e segue o caminho
    // normal — onde a confirmação com o provedor decide.
    //
    // Para o Asaas, que manda token, esse caminho ainda passa pela
    // autenticação e recusa. Para a EFI, que não manda, quem decide é a
    // confirmação — ver o bloco no fim deste arquivo.
    const r = await POST(
      new Request("https://exemplo.test/x", {
        method: "POST",
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          payment: { id: "p1", value: 990 },
        }),
      }),
      { params: Promise.resolve({ provedor: "asaas" }) }
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

describe("a EFI entra sem token, mas nunca sem confirmação", () => {
  it("aviso da EFI passa sem token — ela não tem como enviar um", async () => {
    const r = await pedir(
      JSON.stringify({ pix: [{ txid: "abc123", valor: "1.00" }] })
    );
    expect(r.status).toBe(200);
    expect(processarAviso).toHaveBeenCalled();
    // E entra COM confirmador: é ele que faz o papel da autenticação.
    expect(processarAviso.mock.calls[0]?.[1]).toBeTypeOf("function");
  });

  it("sem credencial da EFI, o aviso é RECUSADO", async () => {
    // Sem token e sem confirmação, a rota viraria uma porta pública que
    // aceita "pagou" de qualquer um. É o pior estado possível, e ele não
    // pode acontecer por uma variável esquecida no painel.
    configOk.tem = false;

    const r = await pedir(
      JSON.stringify({ pix: [{ txid: "abc123", valor: "990.00" }] })
    );

    expect(r.status).toBe(503);
    expect(processarAviso).not.toHaveBeenCalled();
  });

  it("o Asaas continua exigindo token", async () => {
    // A mudança é só da EFI. Quem manda prova de origem segue conferido.
    const r = await POST(
      new Request("https://exemplo.test/x", {
        method: "POST",
        body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: "p1" } }),
      }),
      { params: Promise.resolve({ provedor: "asaas" }) }
    );
    expect(r.status).toBe(401);
  });
});
