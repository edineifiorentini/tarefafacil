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
const registrarPagamento = vi.fn();
const registrarEvento = vi.fn();

/**
 * As DUAS formas de achar a fatura, separadas de propósito.
 *
 * `porHistorico` é a busca em `provider_charge_ids` (0090) e `porColuna` é
 * a antiga, em `provider_charge_id`. Um mock que respondesse igual aos dois
 * não conseguiria provar que o pagamento feito no código ANTERIOR ainda
 * casa com a fatura depois de uma renovação — que é o motivo de o histórico
 * existir.
 */
const porHistorico = vi.fn();
const porColuna = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabela: string) => {
      if (tabela === "payment_event") return { insert };
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: porColuna() }),
            }),
            contains: () => ({
              maybeSingle: async () => ({ data: porHistorico() }),
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/billing/settle", () => ({ registrarPagamento }));
vi.mock("@/lib/admin/audit", () => ({
  registrarEventoDePlataforma: registrarEvento,
}));

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
  porHistorico
    .mockReset()
    .mockReturnValue({ id: "fatura-1", status: "aberta" });
  porColuna.mockReset().mockReturnValue(null);
  registrarEvento.mockReset().mockResolvedValue(undefined);
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
    porHistorico.mockReturnValue(null);
    porColuna.mockReturnValue(null);
    const confirmar = vi.fn();

    const r = await processarAviso(AVISO, confirmar);

    expect(r.acao).toBe("sem_fatura");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("fatura já paga não pergunta de novo", async () => {
    porHistorico.mockReturnValue({ id: "f1", status: "paga" });
    const confirmar = vi.fn();

    const r = await processarAviso(AVISO, confirmar);

    expect(r.acao).toBe("fatura_ja_paga");
    expect(confirmar).not.toHaveBeenCalled();
  });
});

describe("renovar o código não faz o pagamento anterior sumir", () => {
  it("o txid antigo continua achando a fatura, pelo histórico", async () => {
    // O cenário: o cliente pagou faltando minutos para o código vencer, o
    // aviso atrasou, e nesse meio tempo alguém renovou. `provider_charge_id`
    // já é o código NOVO — só o histórico ainda conhece o velho.
    porColuna.mockReturnValue(null);
    porHistorico.mockReturnValue({ id: "fatura-1", status: "aberta" });

    const confirmar = vi
      .fn()
      .mockResolvedValue({ pago: true, valorCents: 9900, pagoEm: null });

    const r = await processarAviso(AVISO, confirmar);

    expect(r.acao).toBe("quitou");
    expect(registrarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({ chargeId: "fatura-1" })
    );
  });

  it("a coluna antiga ainda serve de rede para linha sem histórico", async () => {
    porHistorico.mockReturnValue(null);
    porColuna.mockReturnValue({ id: "fatura-velha", status: "aberta" });

    const r = await processarAviso(AVISO);

    expect(r.acao).toBe("quitou");
    expect(registrarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({ chargeId: "fatura-velha" })
    );
  });

  it("pagar duas vezes a mesma fatura vira registro, não silêncio", async () => {
    // Dois códigos vivos ao mesmo tempo não deveriam existir, mas se o
    // cliente pagar o antigo e o novo o dinheiro entra duas vezes. Não dá
    // para creditar dois meses — e alguém precisa saber para devolver.
    porHistorico.mockReturnValue({ id: "f1", status: "paga" });

    const r = await processarAviso(AVISO);

    expect(r.acao).toBe("fatura_ja_paga");
    expect(registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "subscription_charge",
        entidadeId: "f1",
        resumo: "recebeu pagamento de uma fatura que já estava paga",
      })
    );
  });
});
