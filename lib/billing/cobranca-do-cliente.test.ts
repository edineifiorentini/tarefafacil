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
const atualizado = vi.fn();
const criarPix = vi.fn();
/** `renovar_cobranca` (0090). Devolve `true` quando o banco deixou renovar. */
const chamouRpc = vi.fn();
/** Auditoria de plataforma: é onde o motivo da recusa do provedor fica. */
const registrarEvento = vi.fn();

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
    update: (linha: Record<string, unknown>) => {
      atualizado(linha);
      return { eq: async () => ({ error: null }) };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (nome: string) => tabela(nome),
    rpc: async (nome: string, args: Record<string, unknown>) => ({
      data: chamouRpc(nome, args),
      error: null,
    }),
  }),
}));

vi.mock("@/lib/admin/audit", () => ({
  registrarEventoDePlataforma: registrarEvento,
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
  atualizado.mockReset();
  chamouRpc.mockReset().mockReturnValue(true);
  registrarEvento.mockReset().mockResolvedValue(undefined);
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

  it("período já cobrado não gera SEGUNDA cobrança", async () => {
    // Cancelada de propósito: é o estado em que não há nem o que renovar,
    // então o que sobra é a trava do período.
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = { status: "cancelada", paid_at: null, expires_at: null };
    const r = await gerarCobranca("ws1", HOJE);
    expect(r.estado).toBe("sem_cobranca");
    expect(criarPix).not.toHaveBeenCalled();
    expect(inserido).not.toHaveBeenCalled();
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
      acao: "gerar",
    });
  });

  it("cobrança do ciclo cancelada: não oferece — desfazer não é do cliente", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = { status: "cancelada", paid_at: null, expires_at: null };
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ estado: "sem_cobranca", podeGerar: false });
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
    tabelas.doCiclo = {
      id: "abcd1234-0000-0000-0000-000000000000",
      status: "paga",
      paid_at: "2026-09-06T10:00:00Z",
      // Pagou 89 numa fatura de 99: o que a tela mostra é o que ENTROU.
      paid_amount_cents: 8900,
      amount_cents: 9900,
      period_start: "2026-09-05",
      period_end: "2026-10-05",
      provider: "efi:producao",
      copia_e_cola: "000201…",
    };
    tabelas.acessoAte = "2026-10-10";

    const r = await estadoAtual("ws1", HOJE);

    expect(r).toEqual({
      estado: "paga",
      pagaEm: "2026-09-06T10:00:00Z",
      acessoAte: "2026-10-10",
      valorCents: 8900,
      periodo: { inicio: "2026-09-05", fim: "2026-10-05" },
      // Determinística: mesma fatura, mesmo código, sempre. É o que o
      // cliente cita no suporte — e nunca é o txid, que muda a cada
      // renovação de código (0090).
      referencia: "TF-20260905-ABCD",
    });
  });

  it("sem valor recebido gravado, mostra o valor da fatura", async () => {
    // Fatura antiga, quitada antes de `paid_amount_cents` existir. Mostrar
    // "R$ 0,00" ali seria pior que mostrar o valor cobrado.
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = {
      id: "ffff1234-0000-0000-0000-000000000000",
      status: "paga",
      paid_at: "2026-09-06T10:00:00Z",
      paid_amount_cents: null,
      amount_cents: 9900,
      period_start: "2026-09-05",
      period_end: "2026-10-05",
      provider: "efi:producao",
      copia_e_cola: "000201…",
    };

    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ estado: "paga", valorCents: 9900 });
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

describe("código Pix vencido tem saída: renovar a MESMA linha (0090)", () => {
  /** A fatura do ciclo, emitida quando o plano custava outro preço. */
  const DO_CICLO = {
    id: "fatura-do-ciclo",
    amount_cents: 4900,
    plan_name: "Pro",
    status: "expirada",
    paid_at: null,
    expires_at: "2026-09-09T12:00:00Z",
    period_start: "2026-09-05",
    period_end: "2026-10-05",
    provider: "efi:homologacao",
    copia_e_cola: "000201…antigo",
  };

  it("a tela oferece renovar, não gerar", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = DO_CICLO;
    const r = await estadoAtual("ws1", HOJE);
    expect(r).toEqual({
      estado: "sem_cobranca",
      motivo:
        "O código Pix deste período venceu. Gere um novo — a conta continua a mesma.",
      podeGerar: true,
      acao: "renovar",
    });
  });

  it("aberta com o prazo no passado NÃO é aberta: nada de QR morto na tela", async () => {
    // A varredura que troca o status para `expirada` é DIÁRIA (regra 13).
    // Até ela passar, a linha continua `aberta` — e mostrar o código dela
    // seria apresentar como válido um Pix que o banco recusa.
    tabelas.aberta = {
      id: "fatura-do-ciclo",
      amount_cents: 4900,
      copia_e_cola: "000201morto",
      qr_code: null,
      expires_at: "2026-09-09T12:00:00Z",
      period_start: "2026-09-05",
      period_end: "2026-10-05",
      provider: "efi:homologacao",
    };
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = { ...DO_CICLO, status: "aberta" };

    const r = await estadoAtual("ws1", HOJE);
    expect(r).toMatchObject({ podeGerar: true, acao: "renovar" });
  });

  it("renovar cobra o valor DA FATURA, não o preço de hoje", async () => {
    // O plano subiu de 49 para 99 desde a emissão. A dívida de setembro
    // continua sendo a de setembro — renovar troca o código, não o preço.
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = DO_CICLO;

    const r = await gerarCobranca("ws1", HOJE);

    expect(criarPix).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 4900 })
    );
    // Mesma linha: nenhuma segunda fatura para o mesmo mês.
    expect(inserido).not.toHaveBeenCalled();
    expect(chamouRpc).toHaveBeenCalledWith(
      "renovar_cobranca",
      expect.objectContaining({
        p_charge_id: "fatura-do-ciclo",
        p_provider_charge_id: "txid",
      })
    );
    expect(r).toMatchObject({
      estado: "aberta",
      id: "fatura-do-ciclo",
      valorCents: 4900,
      copiaECola: "000201…",
    });
  });

  it("se o banco recusar a renovação, a tela não inventa", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = DO_CICLO;
    // Alguém pagou entre a criação do código e a gravação. A guarda da
    // `renovar_cobranca` recusa, e o código novo fica órfão na EFI — bem
    // melhor que reabrir uma fatura já quitada.
    chamouRpc.mockImplementation(() => {
      tabelas.doCiclo = {
        ...DO_CICLO,
        status: "paga",
        paid_at: "2026-09-10T09:00:00Z",
      };
      return null;
    });

    const r = await gerarCobranca("ws1", HOJE);
    expect(r).toMatchObject({ estado: "paga" });
  });

  it("a criação guarda o txid no histórico desde o começo", async () => {
    // Sem isto, renovar depois perderia o rastro do primeiro código — e com
    // ele o pagamento feito nele.
    await gerarCobranca("ws1", HOJE);
    expect(atualizado).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_charge_id: "txid",
        provider_charge_ids: ["txid"],
      })
    );
  });
});

describe("fatura que ficou sem código não é um beco (0091)", () => {
  /**
   * O caso real: a linha nasce antes da ida ao provedor — é o que faz o
   * índice único segurar dois cliques —, o provedor recusa, e sobra uma
   * fatura `aberta` sem txid e sem copia e cola. Aconteceu em produção em
   * 8/set/2026 e prendia o cliente até o prazo de sete dias correr.
   */
  const SEM_CODIGO = {
    id: "fatura-orfa",
    amount_cents: 9900,
    plan_name: "Pro",
    status: "aberta",
    paid_at: null,
    // Prazo NO FUTURO: sem a regra nova, isto contaria como pagável.
    expires_at: "2026-09-17T12:00:00Z",
    period_start: "2026-09-05",
    period_end: "2026-10-05",
    provider: "efi:homologacao",
    copia_e_cola: null,
    qr_code: null,
  };

  it("não se apresenta como cobrança pagável", async () => {
    tabelas.aberta = SEM_CODIGO;
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = SEM_CODIGO;

    const r = await estadoAtual("ws1", HOJE);

    expect(r.estado).not.toBe("aberta");
    expect(r).toMatchObject({ podeGerar: true, acao: "renovar" });
    // A frase certa: um código que nunca existiu não "venceu".
    expect(r).toHaveProperty(
      "motivo",
      "A cobrança deste período ficou sem código Pix. Gere um novo — a conta continua a mesma."
    );
  });

  it("renova sem esperar os sete dias", async () => {
    tabelas.aberta = SEM_CODIGO;
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = SEM_CODIGO;

    const r = await gerarCobranca("ws1", HOJE);

    expect(chamouRpc).toHaveBeenCalledWith(
      "renovar_cobranca",
      expect.objectContaining({ p_charge_id: "fatura-orfa" })
    );
    expect(r).toMatchObject({ estado: "aberta", id: "fatura-orfa" });
  });

  it("cobrança MANUAL sem código continua normal — ela nasce assim", async () => {
    // Quem manda o Pix é uma pessoa. Tratar isso como defeito ofereceria
    // "gerar código" a quem nunca teve provedor.
    tabelas.aberta = { ...SEM_CODIGO, provider: "manual" };

    const r = await estadoAtual("ws1", HOJE);

    expect(r).toMatchObject({ estado: "aberta", id: "fatura-orfa" });
  });
});

describe("quando o provedor recusa, a falha fala", () => {
  it("o motivo vai para a auditoria e a tela convida a tentar de novo", async () => {
    criarPix.mockRejectedValue(
      new Error("A EFI recusou a criação da cobrança (401). token inválido")
    );

    const r = await gerarCobranca("ws1", HOJE);

    // Nada de 500 mudo: o estado diz o que fazer.
    expect(r).toEqual({
      estado: "sem_cobranca",
      motivo:
        "Não foi possível falar com o provedor de pagamento agora. Tente de novo em alguns minutos.",
      podeGerar: true,
      acao: "renovar",
    });

    // E o motivo REAL fica registrado, que é o que faltava para investigar.
    expect(registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "subscription_charge",
        resumo: "o provedor não gerou o código Pix",
        detalhes: expect.objectContaining({
          provedor: "efi:homologacao",
          motivo: "A EFI recusou a criação da cobrança (401). token inválido",
        }),
      })
    );
  });

  it("a mesma coisa vale renovando", async () => {
    tabelas.cobradas = [{ period_start: "2026-09-05" }];
    tabelas.doCiclo = {
      id: "fatura-do-ciclo",
      amount_cents: 4900,
      plan_name: "Pro",
      status: "expirada",
      paid_at: null,
      expires_at: "2026-09-09T12:00:00Z",
      period_start: "2026-09-05",
      period_end: "2026-10-05",
      provider: "efi:homologacao",
      copia_e_cola: "000201…antigo",
    };
    criarPix.mockRejectedValue(new Error("timeout falando com a EFI"));

    const r = await gerarCobranca("ws1", HOJE);

    expect(r).toMatchObject({ estado: "sem_cobranca", acao: "renovar" });
    // A fatura não foi tocada: o banco nem chegou a ser chamado.
    expect(chamouRpc).not.toHaveBeenCalled();
    expect(registrarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ entidadeId: "fatura-do-ciclo" })
    );
  });
});
