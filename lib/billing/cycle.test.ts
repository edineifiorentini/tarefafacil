import { describe, expect, it } from "vitest";

import {
  GRACE_DAYS,
  accessUntil,
  cycleFor,
  cycleLabel,
  decideCharge,
  deriveStatus,
  nextCycle,
} from "./cycle";

/**
 * Datas construídas por componentes locais: os testes valem em qualquer
 * fuso, que é a propriedade que este módulo precisa ter.
 */
describe("cycleFor", () => {
  // Instantes EXPLÍCITOS, com deslocamento escrito. `new Date(ano, mes,
  // dia)` é meia-noite local: sob TZ=UTC isso já é o dia anterior no
  // Brasil, e dois destes casos passavam por sorte do ambiente.
  it("depois do dia de cobrança, o ciclo começou neste mês", () => {
    const c = cycleFor(new Date("2026-09-20T12:00:00-03:00"), 5);
    expect(c).toEqual({ start: "2026-09-05", end: "2026-10-05" });
  });

  it("antes do dia de cobrança, o ciclo começou no mês passado", () => {
    const c = cycleFor(new Date("2026-09-02T12:00:00-03:00"), 5);
    expect(c).toEqual({ start: "2026-08-05", end: "2026-09-05" });
  });

  it("no próprio dia de cobrança, o ciclo novo já começou", () => {
    const c = cycleFor(new Date("2026-09-05T12:00:00-03:00"), 5);
    expect(c.start).toBe("2026-09-05");
  });

  it("vira o ano sem se perder", () => {
    const c = cycleFor(new Date("2027-01-03T12:00:00-03:00"), 10);
    expect(c).toEqual({ start: "2026-12-10", end: "2027-01-10" });
  });

  it("dia 28 atravessa fevereiro sem andar", () => {
    // É por isso que o banco limita billing_day a 28: com 31 o ciclo mudaria
    // de data sozinho todo fevereiro.
    const c = cycleFor(new Date("2027-02-28T12:00:00-03:00"), 28);
    expect(c).toEqual({ start: "2027-02-28", end: "2027-03-28" });
  });
});

describe("nextCycle", () => {
  it("o próximo começa onde o atual termina — sem buraco nem sobreposição", () => {
    const atual = { start: "2026-09-05", end: "2026-10-05" };
    expect(nextCycle(atual)).toEqual({
      start: "2026-10-05",
      end: "2026-11-05",
    });
  });
});

describe("accessUntil", () => {
  it("o acesso vai até o fim do período mais a carência", () => {
    const ate = accessUntil({ start: "2026-09-05", end: "2026-10-05" });
    expect(ate).toBe("2026-10-10");
    expect(GRACE_DAYS).toBe(5);
  });
});

describe("decideCharge", () => {
  const base = {
    planCode: "pro",
    priceCents: 9900,
    status: "ativa" as const,
    billingDay: 5,
    chargedPeriods: [] as string[],
    now: new Date(2026, 8, 20),
  };

  it("cobra o ciclo corrente quando ainda não foi cobrado", () => {
    const d = decideCharge(base);
    expect(d).toEqual({
      charge: true,
      cycle: { start: "2026-09-05", end: "2026-10-05" },
      amountCents: 9900,
    });
  });

  it("não cobra o mesmo ciclo duas vezes", () => {
    // Rodar o cron duas vezes no mesmo dia não pode gerar duas faturas.
    const d = decideCharge({ ...base, chargedPeriods: ["2026-09-05"] });
    expect(d).toEqual({ charge: false, reason: "já cobrado" });
  });

  it("cobrança de um ciclo antigo não impede a do ciclo novo", () => {
    const d = decideCharge({ ...base, chargedPeriods: ["2026-08-05"] });
    expect(d.charge).toBe(true);
  });

  it("plano gratuito não gera fatura de zero real", () => {
    const d = decideCharge({ ...base, priceCents: 0 });
    expect(d).toEqual({ charge: false, reason: "plano gratuito" });
  });

  it("assinatura cancelada não é cobrada", () => {
    const d = decideCharge({ ...base, status: "cancelada" });
    expect(d).toEqual({ charge: false, reason: "cancelada" });
  });

  // 0085 — a promessa feita a quem testou o produto antes de ele ter preço.
  describe("plano vitalício", () => {
    it("não é cobrado", () => {
      const d = decideCharge({ ...base, vitalicio: true });
      expect(d).toEqual({ charge: false, reason: "plano vitalício" });
    });

    it("não é cobrado NEM COM PREÇO cadastrado", () => {
      // Este é o teste que existe por causa da promessa. Se um dia alguém
      // puser valor no plano vitalício — ou marcar como vitalício um plano
      // que já tem preço —, ninguém pode ser cobrado por isso. É a razão
      // de a decisão olhar a bandeira e não o valor.
      const d = decideCharge({ ...base, vitalicio: true, priceCents: 9900 });
      expect(d).toEqual({ charge: false, reason: "plano vitalício" });
    });

    it("dá o motivo verdadeiro, não 'plano gratuito'", () => {
      // O relatório da execução é o que o dono lê. "Plano gratuito" faria
      // a cortesia parecer efeito colateral do preço zero.
      const d = decideCharge({ ...base, vitalicio: true, priceCents: 0 });
      expect(d).toMatchObject({ reason: "plano vitalício" });
    });

    it("ganha até de assinatura cancelada", () => {
      const d = decideCharge({
        ...base,
        vitalicio: true,
        status: "cancelada",
      });
      expect(d).toEqual({ charge: false, reason: "plano vitalício" });
    });

    it("plano comum segue cobrando — a bandeira não vaza", () => {
      // O pedido do dono foi "os outros planos como já está funcionando".
      expect(decideCharge({ ...base, vitalicio: false }).charge).toBe(true);
      expect(decideCharge(base).charge).toBe(true);
    });
  });
});

describe("deriveStatus", () => {
  const agora = new Date(2026, 8, 20);

  it("acesso no futuro e sem fatura aberta é ativa", () => {
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: { status: "paga", periodEnd: "2026-10-05" },
        accessExpiresAt: "2026-10-10",
        now: agora,
      })
    ).toBe("ativa");
  });

  it("acesso no futuro com fatura aberta é pendente, não vencida", () => {
    // Quem já pagou o mês corrente e recebeu a fatura do próximo não pode
    // aparecer como inadimplente.
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: { status: "aberta", periodEnd: "2026-11-05" },
        accessExpiresAt: "2026-10-10",
        now: agora,
      })
    ).toBe("pendente");
  });

  it("acesso no passado é vencida", () => {
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: { status: "aberta", periodEnd: "2026-09-05" },
        accessExpiresAt: "2026-09-10",
        now: agora,
      })
    ).toBe("vencida");
  });

  it("sem data de acesso não é inadimplência", () => {
    // Assinatura que nunca foi cobrada, ou plano livre: nada devido.
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: null,
        accessExpiresAt: null,
        now: agora,
      })
    ).toBe("ativa");
  });

  it("cancelada vence qualquer outra leitura", () => {
    expect(
      deriveStatus({
        cancelled: true,
        latestCharge: { status: "paga", periodEnd: "2026-10-05" },
        accessExpiresAt: "2026-12-31",
        now: agora,
      })
    ).toBe("cancelada");
  });

  it("no dia exato do vencimento ainda vale — corte é depois, não em cima", () => {
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: null,
        accessExpiresAt: "2026-09-21",
        now: agora,
      })
    ).toBe("ativa");
  });
});

describe("cycleLabel", () => {
  it("descreve o período de forma curta", () => {
    expect(cycleLabel({ start: "2026-09-05", end: "2026-10-05" })).toBe(
      "05/09 a 05/10"
    );
  });
});

// ------------------------------------------------ fuso (8/set/2026)
describe("o ciclo não pode depender do fuso do servidor", () => {
  it("22h de 31/ago no Brasil calcula AGOSTO, não setembro", () => {
    // 2026-08-31 22:00 BRT === 2026-09-01 01:00 UTC.
    //
    // Este é o caso que vale dinheiro: lendo `getDate()` do instante em UTC,
    // o dia seria 1 e o ciclo viraria setembro inteiro — um mês de
    // diferença numa conta que cobra alguém. O cron escapava por rodar às
    // 03:00 do Brasil; o painel, clicado por gente, não.
    const instante = new Date("2026-09-01T01:00:00Z");
    expect(cycleFor(instante, 1, "America/Sao_Paulo")).toEqual({
      start: "2026-08-01",
      end: "2026-09-01",
    });
  });

  it("o mesmo instante em UTC dá setembro — é o defeito que existia", () => {
    const instante = new Date("2026-09-01T01:00:00Z");
    expect(cycleFor(instante, 1, "UTC")).toEqual({
      start: "2026-09-01",
      end: "2026-10-01",
    });
  });

  it("não depende do fuso do processo", () => {
    // Mesmo instante e mesmo fuso pedido têm que dar o mesmo ciclo aqui e
    // na Vercel. É a garantia inteira.
    const instante = new Date("2026-09-15T18:00:00Z");
    expect(cycleFor(instante, 10, "America/Sao_Paulo")).toEqual({
      start: "2026-09-10",
      end: "2026-10-10",
    });
  });

  it("decideCharge respeita o fuso na virada", () => {
    const instante = new Date("2026-09-01T01:00:00Z");
    const d = decideCharge({
      planCode: "pro",
      priceCents: 9900,
      status: "ativa",
      billingDay: 1,
      chargedPeriods: ["2026-08-01"], // agosto já foi cobrado
      now: instante,
      fuso: "America/Sao_Paulo",
    });
    // No Brasil ainda é agosto, e agosto já está pago: não cobra de novo.
    expect(d).toEqual({ charge: false, reason: "já cobrado" });
  });
});

describe("carência configurável", () => {
  it("usa o padrão quando ninguém diz", () => {
    const c = { start: "2026-09-01", end: "2026-10-01" };
    expect(accessUntil(c)).toBe("2026-10-06");
  });

  it("aceita outro número", () => {
    const c = { start: "2026-09-01", end: "2026-10-01" };
    expect(accessUntil(c, 0)).toBe("2026-10-01");
    expect(accessUntil(c, 10)).toBe("2026-10-11");
  });

  it("não depende do fuso — as pontas se cancelam", () => {
    // `accessUntil` parte de data civil, não de instante. Converter aqui
    // seria a dupla conversão que já mordeu duas vezes neste projeto.
    const c = { start: "2026-09-01", end: "2026-10-01" };
    expect(accessUntil(c, 5)).toBe("2026-10-06");
  });
});

describe("o padrão protege quem esquecer de passar o fuso", () => {
  it("sem fuso explícito, responde pelo Brasil mesmo com o processo em UTC", () => {
    // Roda com `TZ=UTC npm run test`, que é o fuso da Vercel. Antes da
    // correção este caso dava setembro, porque o ambiente decidia.
    const instante = new Date("2026-09-01T01:00:00Z");
    expect(cycleFor(instante, 1)).toEqual({
      start: "2026-08-01",
      end: "2026-09-01",
    });
  });
});
