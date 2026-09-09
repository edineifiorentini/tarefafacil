import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O histórico não existia: `subscription_charge` era lida só pelo painel da
 * plataforma, e quem paga não tinha como conferir o que já pagou.
 *
 * O que estes casos vigiam é o que a lista DIZ — valor recebido em vez de
 * cobrado, situação lida do tempo e não só do status gravado, e nenhum nome
 * de integração vazando para a tela.
 */

const tabelas = vi.hoisted(() => ({ linhas: [] as Record<string, unknown>[] }));
const filtros = vi.hoisted(() => ({ menorQue: null as string | null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const encadeado = {
        select: () => encadeado,
        eq: () => encadeado,
        order: () => encadeado,
        limit: () => encadeado,
        lt: (_coluna: string, valor: string) => {
          filtros.menorQue = valor;
          return encadeado;
        },
        then: (aceitar: (r: { data: unknown }) => unknown) =>
          Promise.resolve({
            data: filtros.menorQue
              ? tabelas.linhas.filter(
                  (l) => (l.period_start as string) < filtros.menorQue!
                )
              : tabelas.linhas,
          }).then(aceitar),
      };
      return encadeado;
    },
  }),
}));

const { historicoDeCobrancas, POR_PAGINA } = await import("./historico");

const AGORA = new Date("2026-09-09T12:00:00Z");

function fatura(over: Record<string, unknown> = {}) {
  return {
    id: "f1",
    period_start: "2026-08-05",
    period_end: "2026-09-05",
    plan_name: "Pro",
    amount_cents: 9900,
    paid_amount_cents: null,
    paid_at: null,
    status: "paga",
    provider: "efi:producao",
    expires_at: "2026-08-12T12:00:00Z",
    copia_e_cola: "000201…",
    ...over,
  };
}

beforeEach(() => {
  filtros.menorQue = null;
  tabelas.linhas = [fatura()];
});

describe("o que a linha mostra", () => {
  it("o valor é o que ENTROU quando houve pagamento", async () => {
    // Mostrar sempre o cobrado esconderia um pagamento parcial — que é
    // justamente a diferença que alguém precisaria ver.
    tabelas.linhas = [
      fatura({ paid_amount_cents: 8900, paid_at: "2026-08-06T10:00:00Z" }),
    ];

    const r = await historicoDeCobrancas("ws1", { agora: AGORA });

    expect(r.linhas[0]).toMatchObject({ valorCents: 9900, pagoCents: 8900 });
  });

  it("o ambiente do provedor NUNCA aparece: Pix é Pix", async () => {
    tabelas.linhas = [fatura({ provider: "efi:homologacao" })];
    const r = await historicoDeCobrancas("ws1", { agora: AGORA });
    expect(r.linhas[0]?.formaDePagamento).toBe("Pix");
  });

  it("cobrança manual se identifica como tal", async () => {
    tabelas.linhas = [fatura({ provider: "manual" })];
    const r = await historicoDeCobrancas("ws1", { agora: AGORA });
    expect(r.linhas[0]?.formaDePagamento).toBe("Combinado por fora");
  });

  it("aberta com o prazo vencido aparece como expirada", async () => {
    // A situação vem do tempo, não só do status gravado: a varredura que
    // troca o status é diária.
    tabelas.linhas = [
      fatura({ status: "aberta", expires_at: "2026-09-01T12:00:00Z" }),
    ];

    const r = await historicoDeCobrancas("ws1", { agora: AGORA });

    expect(r.linhas[0]).toMatchObject({
      situacao: "expirada",
      rotulo: "Código Pix expirado",
    });
  });
});

describe("paginação por cursor, não por deslocamento", () => {
  it("não devolve mais que uma página, e avisa que há mais", async () => {
    tabelas.linhas = Array.from({ length: POR_PAGINA + 3 }, (_, i) =>
      fatura({
        id: `f${i}`,
        period_start: `2026-${String(12 - i).padStart(2, "0")}-05`,
      })
    );

    const r = await historicoDeCobrancas("ws1", { agora: AGORA });

    expect(r.linhas).toHaveLength(POR_PAGINA);
    expect(r.proximoCursor).toBe(r.linhas[POR_PAGINA - 1]?.periodo.inicio);
  });

  it("acabou a lista: cursor nulo", async () => {
    const r = await historicoDeCobrancas("ws1", { agora: AGORA });
    expect(r.proximoCursor).toBeNull();
  });

  it("o cursor filtra pelo período, e não por posição", async () => {
    // Com `offset`, uma cobrança emitida entre uma página e outra empurraria
    // a lista e repetiria uma linha.
    tabelas.linhas = [
      fatura({ id: "set", period_start: "2026-09-05" }),
      fatura({ id: "ago", period_start: "2026-08-05" }),
      fatura({ id: "jul", period_start: "2026-07-05" }),
    ];

    const r = await historicoDeCobrancas("ws1", {
      cursor: "2026-08-05",
      agora: AGORA,
    });

    expect(r.linhas.map((l) => l.id)).toEqual(["jul"]);
  });
});
