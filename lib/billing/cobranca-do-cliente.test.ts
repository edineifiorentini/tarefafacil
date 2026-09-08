import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que a empresa NÃO pode conseguir por aqui — e o que a tela NÃO pode
 * prometer.
 *
 * Este é o caminho em que quem paga fala com a cobrança, e a tentação de
 * deixar o valor ou o período virem do pedido é grande: seria mais simples.
 * Cada caso abaixo é uma forma de isso dar errado.
 *
 * O segundo bloco é mais novo e nasceu de um defeito visto na tela: o botão
 * "Gerar cobrança do período" aparecia para todo mundo, inclusive em plano
 * vitalício, onde o clique só podia responder que não há cobrança.
 */

const tabelas = vi.hoisted(() => ({
  assinatura: null as unknown,
  plano: null as unknown,
  /** Cobrança em aberto, se houver. */
  aberta: null as unknown,
  /** A cobrança DO ciclo corrente, aberta ou não. */
  doCiclo: null as unknown,
  /** `period_start` de tudo que já foi cobrado alguma vez. */
  cobradas: [] as { period_start: string }[],
  acessoAte: null as string | null,
}));

const inserido = vi.fn();
const criarPix = vi.fn();

type Resposta = { data: unknown; error: unknown };
type Filtros = Record<string, string>;

/**
 * O encadeamento do supabase-js, curto o bastante para o que este módulo usa.
 *
 * Guarda os `eq` em vez de os ignorar: é o filtro que distingue "a cobrança
 * aberta" de "a cobrança deste ciclo", e um mock que responde igual aos dois
 * deixaria passar exatamente o defeito que estes testes vigiam.
 */
type Encadeado = {
  eq: (coluna: string, valor: string) => Encadeado;
  order: () => Encadeado;
  limit: () => Encadeado;
  maybeSingle: () => Promise<Resposta>;
  single: () => Promise<Resposta>;
  then: (aceitar: (r: Resposta) => unknown) => Promise<unknown>;
};

function encadear(
  responder: (cols: string, filtros: Filtros) => unknown,
  cols: string,
  filtros: Filtros
): Encadeado {
  const resposta = async (): Promise<Resposta> => ({
    data: responder(cols, filtros),
    error: null,
  });
  return {
    eq: (coluna, valor) =>
      encadear(responder, cols, { ...filtros, [coluna]: valor }),
    order: () => encadear(responder, cols, filtros),
    limit: () => encadear(responder, cols, filtros),
    maybeSingle: resposta,
    single: resposta,
    // Consulta de lista é aguardada direto, sem `maybeSingle`.
    then: (aceitar) => resposta().then(aceitar),
  };
}

function tabela(nome: string) {
  const responder = (cols: string, f: Filtros): unknown => {
    if (nome === "subscription") return tabelas.assinatura;
    if (nome === "billing_plan") return tabelas.plano;
    if (nome === "workspace") {
      return { plan_id: null, access_expires_at: tabelas.acessoAte };
    }
    // subscription_charge, três leituras diferentes.
    if (cols === "period_start") return tabelas.cobradas;
    if (f.status === "aberta") return tabelas.aberta;
    if (f.period_start !== undefined) return tabelas.doCiclo;
    return null;
  };

  return {
    select: (cols: string) => encadear(responder, cols, {}),
    insert: (linha: Record<string, unknown>) => {
      inserido(linha);
      return {
        select: () => ({
          single: async () => ({ data: { id: "nova" }, error: null }),
        }),
      };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (nome: string) => tabela(nome) }),
}));

vi.mock("./provider", () => ({
  resolveProvider: () => ({
    modo: "gateway",
    nome: "efi:homologacao",
    gateway: { createPixCharge: criarPix, getChargeStatus: vi.fn() },
  }),
  nomeDoProvedor: () => "efi:homologacao",
}));

const { estadoAtual, gerarCobranca } = await import("./cobranca-do-cliente");

/** 10/set, dia de cobrança 5 → ciclo 05/09 a 05/10. */
const HOJE = new Date("2026-09-10T12:00:00-03:00");

beforeEach(() => {
  inserido.mockReset();
  criarPix.mockReset().mockResolvedValue({
    providerChargeId: "txid",
    qrCode: "",
    copiaECola: "000201…",
    expiresAt: new Date("2026-09-15T12:00:00Z"),
  });
  tabelas.aberta = null;
  tabelas.doCiclo = null;
  tabelas.cobradas = [];
  tabelas.acessoAte = null;
  tabelas.assinatura = { plan_id: "p1", status: "ativa", billing_day: 5 };
  tabelas.plano = {
    id: "p1",
    name: "Pro",
    price_cents: 9900,
    vitalicio: false,
  };
});

describe("o valor nunca vem do pedido", () => {
  it("é o preço do plano, e mais nada", async () => {
    await gerarCobranca("ws1", HOJE);
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
    tabelas.plano = {
      id: "p1",
      name: "Vitalício",
      price_cents: 0,
      vitalicio: true,
    };
    const r = await gerarCobranca("ws1", HOJE);
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
  });

  it("assinatura cancelada não gera", async () => {
    tabelas.assinatura = { plan_id: "p1", status: "cancelada", billing_day: 5 };
    const r = await gerarCobranca("ws1", HOJE);
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
  });

  it("período já cobrado não gera de novo", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = { status: "expirada", paid_at: null };
    const r = await gerarCobranca("ws1", HOJE);
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
  });
});

describe("clicar duas vezes não cria duas cobranças", () => {
  it("com uma aberta, devolve ELA sem falar com o provedor", async () => {
    tabelas.aberta = {
      id: "existente",
      amount_cents: 9900,
      copia_e_cola: "x",
      qr_code: null,
      expires_at: null,
      period_start: "2026-09-05",
      period_end: "2026-10-05",
    };
    const r = await gerarCobranca("ws1", HOJE);
    expect(r).toMatchObject({ estado: "aberta", id: "existente" });
    expect(criarPix).not.toHaveBeenCalled();
    expect(inserido).not.toHaveBeenCalled();
  });
});

describe("o prazo é um só", () => {
  it("o que se pede à EFI é o mesmo que a fatura registra", async () => {
    await gerarCobranca("ws1", HOJE);
    const pedido = criarPix.mock.calls[0]?.[0] as { expiresInSeconds: number };
    const linha = inserido.mock.calls[0]?.[0] as { expires_at: string };
    const esperado = HOJE.getTime() + pedido.expiresInSeconds * 1000;
    // Sem isto, a tela mostraria um QR que o banco já recusa — ou o contrário.
    expect(new Date(linha.expires_at).getTime()).toBe(esperado);
  });
});

describe("a tela só oferece o botão quando gerar pode dar certo", () => {
  it("plano vitalício: diz o motivo e NÃO oferece", async () => {
    tabelas.plano = {
      id: "p1",
      name: "Vitalício",
      price_cents: 0,
      vitalicio: true,
    };
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toEqual({
      estado: "sem_cobranca",
      motivo: "Seu plano é vitalício: não há cobrança.",
      podeGerar: false,
    });
  });

  it("plano gratuito: não oferece", async () => {
    tabelas.plano = {
      id: "p1",
      name: "Grátis",
      price_cents: 0,
      vitalicio: false,
    };
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ estado: "sem_cobranca", podeGerar: false });
  });

  it("assinatura cancelada: não oferece", async () => {
    tabelas.assinatura = { plan_id: "p1", status: "cancelada", billing_day: 5 };
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ estado: "sem_cobranca", podeGerar: false });
  });

  it("plano pago com o ciclo em aberto de fatura: oferece", async () => {
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toEqual({
      estado: "sem_cobranca",
      motivo: "A cobrança deste período ainda não foi gerada.",
      podeGerar: true,
    });
  });

  it("cobrança do ciclo vencida: não oferece, porque o índice único recusaria", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = { status: "expirada", paid_at: null };
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ estado: "sem_cobranca", podeGerar: false });
    expect(r).toHaveProperty(
      "motivo",
      "A cobrança deste período venceu. Peça uma nova a quem administra o sistema."
    );
  });

  it("o clique concorda com a tela: sem podeGerar, não vai ao provedor", async () => {
    tabelas.plano = {
      id: "p1",
      name: "Vitalício",
      price_cents: 0,
      vitalicio: true,
    };
    const visto = await estadoAtual("ws1", HOJE);
    const clicado = await gerarCobranca("ws1", HOJE);
    expect(clicado).toEqual(visto);
    expect(criarPix).not.toHaveBeenCalled();
  });
});

describe("'pagamento em dia' fala do ciclo corrente, não da última fatura", () => {
  it("ciclo pago: em dia, com a data de acesso", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = { status: "paga", paid_at: "2026-09-06T10:00:00Z" };
    tabelas.acessoAte = "2026-10-10";
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toEqual({
      estado: "paga",
      pagaEm: "2026-09-06T10:00:00Z",
      acessoAte: "2026-10-10",
    });
  });

  it("pagou o mês passado e o mês corrente ainda não tem fatura: NÃO é em dia", async () => {
    // O defeito: a consulta pegava a cobrança paga mais recente, de qualquer
    // período. Quem pagou agosto via "Pagamento em dia" em setembro, ao lado
    // de uma data de acesso já vencida — e a conta do mês sumia da tela.
    tabelas.cobradas = [{ period_start: "2026-08-05" }];
    tabelas.doCiclo = { status: "paga", paid_at: "2026-08-06T10:00:00Z" };
    tabelas.acessoAte = "2026-09-10";
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ estado: "sem_cobranca", podeGerar: true });
  });
});
