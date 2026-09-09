import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A rede embaixo do webhook.
 *
 * Ela existe porque a rede foi necessária: em 9/set/2026 um pagamento de
 * verdade chegou, foi notificado no horário e não quitou nada. O que estes
 * casos vigiam é que perguntar ao provedor seja barato, honesto e incapaz
 * de inventar um pagamento.
 */

const tabelas = vi.hoisted(() => ({
  aberta: null as unknown,
  estado: { estado: "aberta" } as unknown,
}));

const atualizado = vi.fn();
const consultarProvedor = vi.fn();
const quitar = vi.fn();
const registrarEvento = vi.fn();
const lerEstado = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: tabelas.aberta }),
              }),
            }),
          }),
        }),
      }),
      update: (linha: Record<string, unknown>) => {
        atualizado(linha);
        return { eq: () => ({ eq: async () => ({ error: null }) }) };
      },
    }),
  }),
}));

vi.mock("./cobranca-do-cliente", () => ({
  estadoAtual: async () => lerEstado(),
}));

vi.mock("./provider", () => ({
  resolveProvider: () => ({
    modo: "gateway",
    nome: "efi:producao",
    gateway: { getChargeStatus: consultarProvedor, createPixCharge: vi.fn() },
  }),
  nomeDoProvedor: () => "efi:producao",
}));

vi.mock("./settle", () => ({ registrarPagamento: quitar }));

vi.mock("@/lib/admin/audit", () => ({
  registrarEventoDePlataforma: registrarEvento,
}));

const { conferirCobranca, INTERVALO_DE_CONFERENCIA_MS } =
  await import("./conciliar");

const AGORA = new Date("2026-09-09T12:00:00Z");

/** Uma fatura aberta, com prazo no futuro e nunca conferida. */
function fatura(over: Record<string, unknown> = {}) {
  return {
    id: "fatura-1",
    provider: "efi:producao",
    provider_charge_id: "txid-abc",
    expires_at: "2026-09-16T12:00:00Z",
    provider_checked_at: null,
    ...over,
  };
}

beforeEach(() => {
  atualizado.mockReset();
  registrarEvento.mockReset().mockResolvedValue(undefined);
  quitar.mockReset().mockResolvedValue({ ok: true, acessoAte: "2026-10-14" });
  consultarProvedor
    .mockReset()
    .mockResolvedValue({ paid: false, paidAt: null, paidAmountCents: null });
  lerEstado.mockReset().mockReturnValue({ estado: "aberta" });
  tabelas.aberta = fatura();
});

describe("conferir não inventa pagamento", () => {
  it("o provedor diz que não pagou: nada é quitado", async () => {
    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("sem_novidade");
    expect(quitar).not.toHaveBeenCalled();
  });

  it("o provedor diz que pagou: quita com o VALOR e a HORA dele", async () => {
    consultarProvedor.mockResolvedValue({
      paid: true,
      paidAt: new Date("2026-09-09T11:58:00Z"),
      paidAmountCents: 1,
    });

    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("quitou");
    expect(quitar).toHaveBeenCalledWith(
      expect.objectContaining({
        chargeId: "fatura-1",
        valorCents: 1,
        pagoEm: "2026-09-09T11:58:00.000Z",
        autor: "sistema:conciliacao",
      })
    );
  });

  it("quitar por conciliação vira registro: significa que o aviso falhou", async () => {
    // Não é rotina. Se a conciliação achou, o webhook não resolveu — e
    // alguém precisa saber disso antes do próximo cliente.
    consultarProvedor.mockResolvedValue({
      paid: true,
      paidAt: null,
      paidAmountCents: 1,
    });

    await conferirCobranca("ws1", AGORA);

    expect(registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        resumo: "pagamento encontrado pela conciliação, não pelo aviso",
      })
    );
  });
});

describe("perguntar ao provedor custa, então não se pergunta à toa", () => {
  it("conferida há pouco: devolve o que já se sabe, sem ida de rede", async () => {
    tabelas.aberta = fatura({
      provider_checked_at: new Date(
        AGORA.getTime() - INTERVALO_DE_CONFERENCIA_MS / 2
      ).toISOString(),
    });

    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("recente");
    expect(consultarProvedor).not.toHaveBeenCalled();
  });

  it("passado o intervalo, pergunta de novo", async () => {
    tabelas.aberta = fatura({
      provider_checked_at: new Date(
        AGORA.getTime() - INTERVALO_DE_CONFERENCIA_MS - 1
      ).toISOString(),
    });

    await conferirCobranca("ws1", AGORA);

    expect(consultarProvedor).toHaveBeenCalledWith("txid-abc");
  });

  it("sem fatura aberta, não há a quem perguntar", async () => {
    tabelas.aberta = null;

    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("nada_a_conferir");
    expect(consultarProvedor).not.toHaveBeenCalled();
  });
});

describe("falha do provedor não vira resposta errada", () => {
  it("provedor fora do ar não é 'não pago', e não marca a conferência", async () => {
    // Marcar aqui faria a próxima tentativa esperar o intervalo por causa
    // de uma conferência que não aconteceu.
    consultarProvedor.mockRejectedValue(new Error("timeout"));

    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("sem_novidade");
    expect(quitar).not.toHaveBeenCalled();
    expect(atualizado).not.toHaveBeenCalledWith(
      expect.objectContaining({ provider_checked_at: expect.anything() })
    );
  });
});

describe("fatura vencida para de parecer viva", () => {
  it("prazo no passado e sem pagamento: fecha na hora", async () => {
    // A varredura que faz isso é DIÁRIA (regra 13). Esperar por ela seria
    // deixar o cliente olhando um QR que o banco já recusa.
    tabelas.aberta = fatura({ expires_at: "2026-09-08T12:00:00Z" });

    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("expirou");
    expect(atualizado).toHaveBeenCalledWith({ status: "expirada" });
  });

  it("vencida MAS paga: o pagamento vence o prazo", async () => {
    // O que expira é o código, não a dívida. Fechar como expirada uma
    // fatura que o provedor diz estar paga seria recusar dinheiro recebido.
    tabelas.aberta = fatura({ expires_at: "2026-09-08T12:00:00Z" });
    consultarProvedor.mockResolvedValue({
      paid: true,
      paidAt: null,
      paidAmountCents: 1,
    });

    const r = await conferirCobranca("ws1", AGORA);

    expect(r.acao).toBe("quitou");
    expect(atualizado).not.toHaveBeenCalledWith({ status: "expirada" });
  });
});
