import { describe, expect, it } from "vitest";

import {
  ehTerminal,
  situacaoDaAssinatura,
  situacaoDaCobranca,
  type SituacaoDaCobranca,
} from "./situacao";

/**
 * A tela dizia "Ativa" porque era o que sobrava.
 *
 * `suspended ? "Bloqueada" : teste ? "Em teste" : "Ativa"` — sem olhar o
 * acesso, sem olhar a assinatura. Empresa vencida há dez dias lia "Ativa".
 * Cada caso abaixo é um degrau que aquela expressão não tinha.
 */

const HOJE = "2026-09-09";

function assinatura(
  over: Partial<Parameters<typeof situacaoDaAssinatura>[0]> = {}
) {
  return situacaoDaAssinatura({
    suspensa: false,
    emTeste: false,
    testeAte: null,
    vitalicio: false,
    cancelada: false,
    acessoAte: "2026-10-09",
    hoje: HOJE,
    ...over,
  });
}

describe("a precedência da assinatura é a regra", () => {
  it("bloqueada vence tudo", () => {
    // Senão uma empresa suspensa apareceria "em teste", e ninguém entenderia
    // por que não consegue entrar.
    const r = assinatura({
      suspensa: true,
      emTeste: true,
      testeAte: "2026-12-01",
    });
    expect(r.situacao).toBe("bloqueada");
  });

  it("cancelada vence vitalício e teste", () => {
    const r = assinatura({ cancelada: true, vitalicio: true });
    expect(r.situacao).toBe("cancelada");
  });

  it("vitalício aparece antes de 'ativa', para a tela poder explicar", () => {
    // Sem este degrau o cliente ficaria esperando uma fatura que nunca vem.
    const r = assinatura({ vitalicio: true, acessoAte: null });
    expect(r.situacao).toBe("vitalicia");
    expect(r.explicacao).toBe("Plano vitalício: não há cobrança.");
  });

  it("teste vence atraso: teste terminando não é inadimplência", () => {
    const r = assinatura({
      emTeste: true,
      testeAte: "2026-09-20",
      acessoAte: "2026-09-01",
    });
    expect(r.situacao).toBe("teste");
  });

  it("teste JÁ terminado não segura mais nada", () => {
    const r = assinatura({
      emTeste: true,
      testeAte: "2026-09-08",
      acessoAte: "2026-09-01",
    });
    expect(r.situacao).toBe("atrasada");
  });
});

describe("acesso vencido para de ler 'Ativa'", () => {
  it("acesso no passado é atraso", () => {
    // O DEFEITO que este módulo existe para consertar.
    expect(assinatura({ acessoAte: "2026-08-30" }).situacao).toBe("atrasada");
  });

  it("acesso vencendo HOJE ainda vale", () => {
    // A data é até quando o acesso vale, inclusive. Cortar quem pagou no dia
    // é o pior defeito possível num SaaS.
    expect(assinatura({ acessoAte: HOJE }).situacao).toBe("ativa");
  });

  it("sem data de acesso não é atraso: é quem nunca foi cobrado", () => {
    expect(assinatura({ acessoAte: null }).situacao).toBe("ativa");
  });
});

describe("uma fatura em aberto não derruba a assinatura", () => {
  it("empresa ativa com Pix pendente continua ativa", () => {
    // Não é inconsistência: é o estado normal de todo dia 1º. Assinatura e
    // cobrança são objetos diferentes.
    const a = assinatura({ acessoAte: "2026-10-09" });
    const c = situacaoDaCobranca({
      status: "aberta",
      expiraEm: "2026-09-16T12:00:00Z",
      temCodigo: true,
      agora: new Date("2026-09-09T12:00:00Z"),
    });
    expect(a.situacao).toBe("ativa");
    expect(c).toBe("aguardando");
  });
});

describe("a cobrança lida com o tempo, não só com o status gravado", () => {
  const agora = new Date("2026-09-09T12:00:00Z");

  it("aberta e no prazo: aguardando", () => {
    expect(
      situacaoDaCobranca({
        status: "aberta",
        expiraEm: "2026-09-16T12:00:00Z",
        temCodigo: true,
        agora,
      })
    ).toBe("aguardando");
  });

  it("aberta com o prazo no passado já é expirada", () => {
    // A varredura que troca o status é DIÁRIA (regra 13). Até ela passar, a
    // tela mostraria como pagável um código que o banco já recusa.
    expect(
      situacaoDaCobranca({
        status: "aberta",
        expiraEm: "2026-09-08T12:00:00Z",
        temCodigo: true,
        agora,
      })
    ).toBe("expirada");
  });

  it("aberta SEM código também não é pagável", () => {
    // A fatura nasce antes da ida ao provedor; uma recusa dele deixa a linha
    // para trás sem QR nenhum.
    expect(
      situacaoDaCobranca({
        status: "aberta",
        expiraEm: "2026-09-16T12:00:00Z",
        temCodigo: false,
        agora,
      })
    ).toBe("expirada");
  });

  it("paga vence o prazo vencido", () => {
    expect(
      situacaoDaCobranca({
        status: "paga",
        expiraEm: "2026-09-01T12:00:00Z",
        temCodigo: true,
        agora,
      })
    ).toBe("paga");
  });

  it("status desconhecido não vira 'pagável'", () => {
    expect(
      situacaoDaCobranca({
        status: "coisa_estranha",
        expiraEm: null,
        temCodigo: true,
        agora,
      })
    ).toBe("falhou");
  });
});

describe("estado terminal para a consulta automática", () => {
  it("continua perguntando só enquanto pode mudar", () => {
    const terminais: SituacaoDaCobranca[] = [
      "paga",
      "expirada",
      "falhou",
      "cancelada",
    ];
    for (const s of terminais) expect(ehTerminal(s)).toBe(true);
    expect(ehTerminal("aguardando")).toBe(false);
    expect(ehTerminal("processando")).toBe(false);
  });
});
