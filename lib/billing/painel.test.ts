import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As duas datas da assinatura recebem tratamentos OPOSTOS, e cada um é o
 * certo. Estes casos existem para ninguém "uniformizar" os dois depois.
 *
 * `trial_ends_at` é `now() + interval '7 days'` (0060) — instante de
 * verdade, que precisa do fuso escrito. `access_expires_at` guarda uma DATA
 * CIVIL escrita como texto pelo `settle.ts`; convertê-la com fuso a jogaria
 * um dia para trás, e cortar o acesso de quem pagou é o pior defeito
 * possível aqui.
 *
 * Rodam também sob `TZ=UTC`, que é a sonda que acha esta classe de defeito.
 */

const tabelas = vi.hoisted(() => ({
  workspace: null as unknown,
  assinatura: null as unknown,
  plano: null as unknown,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (nome: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data:
              nome === "workspace"
                ? tabelas.workspace
                : nome === "subscription"
                  ? tabelas.assinatura
                  : tabelas.plano,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("./cobranca-do-cliente", () => ({
  estadoAtual: async () => ({
    estado: "sem_cobranca",
    motivo: "Nada a pagar no momento.",
    podeGerar: false,
  }),
}));

const { painelDaCobranca } = await import("./painel");

/** 9/set às 12h em São Paulo — mesmo dia civil em UTC, para o teste não depender disso. */
const AGORA = new Date("2026-09-09T15:00:00Z");

beforeEach(() => {
  tabelas.workspace = {
    plan_id: "p1",
    suspended: false,
    trial: false,
    trial_ends_at: null,
    access_expires_at: null,
  };
  tabelas.assinatura = { plan_id: "p1", status: "ativa" };
  tabelas.plano = { vitalicio: false };
});

describe("`access_expires_at` é data civil, e não pode andar para trás", () => {
  it("acesso que vale HOJE continua valendo", async () => {
    // Gravado como "2026-09-09" pelo `settle.ts`, o Postgres guarda
    // meia-noite UTC. Converter isso para o fuso do Brasil daria 21h do dia
    // 8 — e a empresa seria cortada um dia antes de vencer.
    tabelas.workspace = {
      plan_id: "p1",
      suspended: false,
      trial: false,
      trial_ends_at: null,
      access_expires_at: "2026-09-09T00:00:00+00:00",
    };

    const r = await painelDaCobranca("ws1", AGORA);
    expect(r.assinatura.situacao).toBe("ativa");
  });

  it("acesso vencido ontem é atraso", async () => {
    tabelas.workspace = {
      plan_id: "p1",
      suspended: false,
      trial: false,
      trial_ends_at: null,
      access_expires_at: "2026-09-08T00:00:00+00:00",
    };

    const r = await painelDaCobranca("ws1", AGORA);
    expect(r.assinatura.situacao).toBe("atrasada");
  });
});

describe("`trial_ends_at` é instante, e precisa do fuso escrito", () => {
  it("teste que termina às 2h UTC já terminou no dia seguinte no Brasil", async () => {
    // 10/set 02:00 UTC é 9/set 23:00 em São Paulo: o dia civil do fim do
    // teste é 9. Em 10/set, o teste acabou. Recortar os dez primeiros
    // caracteres daria "2026-09-10" e esticaria o teste um dia.
    tabelas.workspace = {
      plan_id: "p1",
      suspended: false,
      trial: true,
      trial_ends_at: "2026-09-10T02:00:00Z",
      access_expires_at: null,
    };

    const r = await painelDaCobranca("ws1", new Date("2026-09-10T15:00:00Z"));
    expect(r.assinatura.situacao).not.toBe("teste");
  });

  it("teste em curso é teste", async () => {
    tabelas.workspace = {
      plan_id: "p1",
      suspended: false,
      trial: true,
      trial_ends_at: "2026-09-20T02:00:00Z",
      access_expires_at: null,
    };

    const r = await painelDaCobranca("ws1", AGORA);
    expect(r.assinatura.situacao).toBe("teste");
  });
});

describe("o que sai do painel", () => {
  it("assinatura cancelada aparece — e o navegador não conseguiria saber", async () => {
    // A RLS de `subscription` só responde ao dono (0049). É por isso que
    // esta leitura mora no servidor.
    tabelas.assinatura = { plan_id: "p1", status: "cancelada" };

    const r = await painelDaCobranca("ws1", AGORA);
    expect(r.assinatura.situacao).toBe("cancelada");
  });

  it("plano vitalício explica que não haverá cobrança", async () => {
    tabelas.plano = { vitalicio: true };

    const r = await painelDaCobranca("ws1", AGORA);
    expect(r.assinatura.situacao).toBe("vitalicia");
  });

  it("NENHUM valor sai na leitura da assinatura", async () => {
    // A 0049 diz que nem admin do workspace vê valor. O meio-termo do dono
    // (9/set/2026) foi: estado sim, valor não.
    const r = await painelDaCobranca("ws1", AGORA);
    const campos = Object.keys(r.assinatura).sort();
    expect(campos).toEqual(["explicacao", "rotulo", "situacao", "tom"]);
  });
});
