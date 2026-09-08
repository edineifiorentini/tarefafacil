import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A regra 5: confirmar com o provedor antes de quitar.
 *
 * Ela existe por um buraco concreto. A EFI se autentica por mTLS, que a
 * Vercel não entrega para a função — então o corpo do aviso não prova
 * origem, e quem descobrisse a URL poderia postar um "pagou" e estender
 * acesso de graça. Os casos abaixo são as formas de esse ataque funcionar.
 */

const insert = vi.fn();
const maybeSingle = vi.fn();
const registrarPagamento = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabela: string) => {
      if (tabela === "payment_event") return { insert };
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle }) }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/billing/settle", () => ({ registrarPagamento }));

const { processarAviso } = await import("./webhook");

const AVISO = {
  provedor: "efi" as const,
  externalId: "E123",
  providerChargeId: "txid-abc",
  pago: true,
  valorCents: 9900,
  pagoEm: "2026-09-08T12:00:00Z",
  payload: {} as never,
};

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  maybeSingle.mockReset().mockResolvedValue({
    data: { id: "fatura-1", status: "aberta" },
  });
  registrarPagamento
    .mockReset()
    .mockResolvedValue({ ok: true, acessoAte: "2026-10-06" });
});

describe("aviso forjado não quita fatura", () => {
  it("o provedor diz que NÃO foi pago: a fatura fica aberta", async () => {
    const confirmar = vi.fn().mockResolvedValue({
      pago: false,
      valorCents: null,
      pagoEm: null,
    });

    const r = await processarAviso(AVISO, confirmar);

    expect(confirmar).toHaveBeenCalledWith("txid-abc");
    expect(registrarPagamento).not.toHaveBeenCalled();
    expect(r.acao).toBe("ignorado");
    // 200 e não erro: reenviar não muda a resposta do provedor, e 5xx aqui
    // criaria fila infinita de reenvio.
    expect(r.status).toBe(200);
  });

  it("o VALOR que vale é o do provedor, não o do aviso", async () => {
    // O ataque sutil: aviso legítimo de R$ 1 com o valor inflado para
    // R$ 990. Sem a regra 5, o registro guardaria o valor mentiroso.
    const confirmar = vi.fn().mockResolvedValue({
      pago: true,
      valorCents: 100,
      pagoEm: "2026-09-08T13:00:00Z",
    });

    await processarAviso({ ...AVISO, valorCents: 99000 }, confirmar);

    expect(registrarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({ valorCents: 100 })
    );
  });

  it("provedor fora do ar devolve 500, para o aviso ser reenviado", async () => {
    const confirmar = vi.fn().mockRejectedValue(new Error("timeout"));

    const r = await processarAviso(AVISO, confirmar);

    expect(registrarPagamento).not.toHaveBeenCalled();
    // Aqui reenviar é o certo: o pagamento pode ter acontecido e a falha
    // foi nossa em conferir.
    expect(r.status).toBe(500);
  });

  it("sem confirmador, o comportamento antigo continua", async () => {
    // Asaas e Mercado Pago já se autenticam de um jeito que se sustenta.
    const r = await processarAviso(AVISO);
    expect(registrarPagamento).toHaveBeenCalled();
    expect(r.acao).toBe("quitou");
  });
});

describe("a confirmação não roda à toa", () => {
  it("evento repetido para antes de perguntar ao provedor", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    const confirmar = vi.fn();

    const r = await processarAviso(AVISO, confirmar);

    expect(r.acao).toBe("repetido");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("aviso sem fatura correspondente não gasta ida de rede", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const confirmar = vi.fn();

    const r = await processarAviso(AVISO, confirmar);

    expect(r.acao).toBe("sem_fatura");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("fatura já paga não pergunta de novo", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "f1", status: "paga" } });
    const confirmar = vi.fn();

    const r = await processarAviso(AVISO, confirmar);

    expect(r.acao).toBe("fatura_ja_paga");
    expect(confirmar).not.toHaveBeenCalled();
  });
});
