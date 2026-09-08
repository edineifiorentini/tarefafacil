import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que a empresa NÃO pode conseguir por aqui.
 *
 * Este é o caminho em que quem paga fala com a cobrança, e a tentação de
 * deixar o valor ou o período virem do pedido é grande — seria mais simples.
 * Cada caso abaixo é uma forma de isso dar errado.
 */

const tabelas = vi.hoisted(() => ({
  assinatura: null as unknown,
  plano: null as unknown,
  aberta: null as unknown,
  paga: null as unknown,
  cobradas: [] as { period_start: string }[],
}));

const inserido = vi.fn();
const criarPix = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (t: string) => {
      const resposta = (dado: unknown) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: dado }) }) }),
            }),
            maybeSingle: async () => ({ data: dado }),
            order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: dado }) }) }),
            then: undefined,
          }),
        }),
      });
      if (t === "subscription") return resposta(tabelas.assinatura);
      if (t === "billing_plan") return resposta(tabelas.plano);
      if (t === "workspace") return resposta({ plan_id: null, access_expires_at: null });
      // subscription_charge: leituras e o insert.
      return {
        select: (cols: string) => ({
          eq: (_c: string, _v: string) => {
            if (cols.includes("period_start") && !cols.includes("id,")) {
              return Promise.resolve({ data: tabelas.cobradas });
            }
            return {
              eq: (_c2: string, v2: string) => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: v2 === "aberta" ? tabelas.aberta : tabelas.paga,
                    }),
                  }),
                }),
              }),
            };
          },
        }),
        insert: (linha: Record<string, unknown>) => {
          inserido(linha);
          return { select: () => ({ single: async () => ({ data: { id: "nova" }, error: null }) }) };
        },
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    },
  }),
}));

vi.mock("./provider", () => ({
  resolveProvider: () => ({
    modo: "gateway",
    nome: "efi:homologacao",
    gateway: { createPixCharge: criarPix, getChargeStatus: vi.fn() },
  }),
  nomeDoProvedor: () => "efi:homologacao",
}));

const { gerarCobranca } = await import("./cobranca-do-cliente");

beforeEach(() => {
  inserido.mockReset();
  criarPix.mockReset().mockResolvedValue({
    providerChargeId: "txid", qrCode: "", copiaECola: "000201…",
    expiresAt: new Date("2026-09-15T12:00:00Z"),
  });
  tabelas.aberta = null;
  tabelas.paga = null;
  tabelas.cobradas = [];
  tabelas.assinatura = { plan_id: "p1", status: "ativa", billing_day: 5 };
  tabelas.plano = { id: "p1", name: "Pro", price_cents: 9900, vitalicio: false };
});

describe("o valor nunca vem do pedido", () => {
  it("é o preço do plano, e mais nada", async () => {
    await gerarCobranca("ws1", new Date("2026-09-10T12:00:00-03:00"));
    expect(criarPix).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 9900 })
    );
    expect(inserido).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 9900 })
    );
  });
});

describe("as travas do decideCharge valem aqui também", () => {
  it("plano vitalício não gera cobrança", async () => {
    tabelas.plano = { id: "p1", name: "Vitalício", price_cents: 0, vitalicio: true };
    const r = await gerarCobranca("ws1", new Date("2026-09-10T12:00:00-03:00"));
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
  });

  it("assinatura cancelada não gera", async () => {
    tabelas.assinatura = { plan_id: "p1", status: "cancelada", billing_day: 5 };
    const r = await gerarCobranca("ws1", new Date("2026-09-10T12:00:00-03:00"));
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
  });

  it("período já cobrado não gera de novo", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    const r = await gerarCobranca("ws1", new Date("2026-09-10T12:00:00-03:00"));
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
  });
});

describe("clicar duas vezes não cria duas cobranças", () => {
  it("com uma aberta, devolve ELA sem falar com o provedor", async () => {
    tabelas.aberta = {
      id: "existente", amount_cents: 9900, copia_e_cola: "x", qr_code: null,
      expires_at: null, period_start: "2026-09-05", period_end: "2026-10-05",
    };
    const r = await gerarCobranca("ws1", new Date("2026-09-10T12:00:00-03:00"));
    expect(r).toMatchObject({ estado: "aberta", id: "existente" });
    expect(criarPix).not.toHaveBeenCalled();
    expect(inserido).not.toHaveBeenCalled();
  });
});

describe("o prazo é um só", () => {
  it("o que se pede à EFI é o mesmo que a fatura registra", async () => {
    await gerarCobranca("ws1", new Date("2026-09-10T12:00:00-03:00"));
    const pedido = criarPix.mock.calls[0]?.[0] as { expiresInSeconds: number };
    const linha = inserido.mock.calls[0]?.[0] as { expires_at: string };
    const esperado = new Date("2026-09-10T12:00:00-03:00").getTime() + pedido.expiresInSeconds * 1000;
    // Sem isto, a tela mostraria um QR que o banco já recusa — ou o contrário.
    expect(new Date(linha.expires_at).getTime()).toBe(esperado);
  });
});
