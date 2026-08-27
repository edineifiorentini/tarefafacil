// A execução da cobrança: percorre as assinaturas, decide, e cria as faturas
// do ciclo. Só servidor.
//
// Este é o arquivo que LIGA o motor. `cycle.ts` já sabia decidir e estava
// testado; faltava alguém chamá-lo e escrever no banco.
//
// TRÊS GARANTIAS, e a ordem delas importa:
//
// 1. **Simulação é o padrão de quem chama.** Nenhuma função aqui cobra sem
//    receber `simulacao: false` explicitamente.
// 2. **A idempotência mora no banco**, no índice único
//    (workspace_id, period_start) da 0049. Rodar duas vezes no mesmo dia não
//    cria duas faturas: a segunda esbarra no índice e vira "já existia".
//    Não se confia no job rodar certo.
// 3. **Uma falha não derruba a execução inteira.** Cada assinatura é
//    independente; um erro numa empresa é registrado na linha dela e a
//    varredura continua. Parar tudo por causa de uma faria as outras
//    ficarem sem fatura no mês.

import { createAdminClient } from "@/lib/supabase/admin";

import { chargeExpiresAt, cycleFor, decideCharge, type Cycle } from "./cycle";
import { nomeDoProvedor, resolveProvider } from "./provider";

export type ResultadoDaLinha = {
  workspaceId: string;
  empresa: string;
  planoNome: string | null;
  valorCents: number;
  ciclo: Cycle | null;
  /**
   * - `simulado`  — daria cobrança, mas nada foi escrito.
   * - `criada`    — fatura gravada agora.
   * - `ja_existia`— o índice único barrou: o ciclo já tinha fatura.
   * - `pulou`     — a regra decidiu não cobrar; `motivo` diz por quê.
   * - `erro`      — falhou nesta empresa; as outras seguiram.
   */
  resultado: "simulado" | "criada" | "ja_existia" | "pulou" | "erro";
  motivo?: string;
};

export type ResumoDaCobranca = {
  simulacao: boolean;
  /** "manual" ou o nome do gateway. */
  provedor: string;
  executadoEm: string;
  avaliadas: number;
  /** Quantas gerariam (ou geraram) fatura. */
  aCobrar: number;
  criadas: number;
  jaExistiam: number;
  erros: number;
  totalCents: number;
  linhas: ResultadoDaLinha[];
};

export async function runBilling(opts: {
  simulacao: boolean;
  agora?: Date;
}): Promise<ResumoDaCobranca> {
  const db = createAdminClient();
  const agora = opts.agora ?? new Date();
  const modo = resolveProvider();
  const provedor = nomeDoProvedor(modo);

  const [assinRes, planosRes, wsRes, cobrancasRes] = await Promise.all([
    db
      .from("subscription")
      .select("workspace_id, plan_id, status, billing_day, cancel_at"),
    db.from("billing_plan").select("id, name, price_cents"),
    db
      .from("workspace")
      .select("id, name, plan_id, trial, suspended, deleted_at")
      .is("deleted_at", null),
    db.from("subscription_charge").select("workspace_id, period_start"),
  ]);

  type S = {
    workspace_id: string;
    plan_id: string | null;
    status: string;
    billing_day: number;
    cancel_at: string | null;
  };
  type W = {
    id: string;
    name: string;
    plan_id: string | null;
    trial: boolean;
    suspended: boolean;
  };

  const empresas = new Map(((wsRes.data ?? []) as W[]).map((w) => [w.id, w]));
  const planos = new Map(
    (
      (planosRes.data ?? []) as {
        id: string;
        name: string;
        price_cents: number;
      }[]
    ).map((p) => [p.id, p])
  );

  // Períodos já cobrados, por empresa. Lidos de uma vez: consultar por
  // assinatura seria uma ida ao banco por linha.
  const periodos = new Map<string, string[]>();
  for (const c of (cobrancasRes.data ?? []) as {
    workspace_id: string;
    period_start: string;
  }[]) {
    const lista = periodos.get(c.workspace_id) ?? [];
    lista.push(c.period_start);
    periodos.set(c.workspace_id, lista);
  }

  const linhas: ResultadoDaLinha[] = [];

  for (const a of (assinRes.data ?? []) as S[]) {
    const empresa = empresas.get(a.workspace_id);

    // Empresa excluída logicamente não aparece na leitura acima. Cobrar
    // quem foi excluído seria emitir fatura para conta que o cliente já não
    // acessa.
    if (!empresa) continue;

    const base = {
      workspaceId: a.workspace_id,
      empresa: empresa.name,
      planoNome: null as string | null,
      valorCents: 0,
      ciclo: null as Cycle | null,
    };

    if (empresa.suspended) {
      linhas.push({ ...base, resultado: "pulou", motivo: "empresa suspensa" });
      continue;
    }
    if (empresa.trial) {
      linhas.push({ ...base, resultado: "pulou", motivo: "em teste" });
      continue;
    }

    // Cancelamento agendado que já venceu: a assinatura acabou, não cobra.
    // O encerramento em si é trabalho de `expirarCancelamentos`.
    if (a.cancel_at && new Date(a.cancel_at).getTime() <= agora.getTime()) {
      linhas.push({
        ...base,
        resultado: "pulou",
        motivo: "cancelamento agendado venceu",
      });
      continue;
    }

    const planId = a.plan_id ?? empresa.plan_id;
    const plano = planId ? planos.get(planId) : undefined;
    if (!plano) {
      linhas.push({ ...base, resultado: "pulou", motivo: "sem plano" });
      continue;
    }

    const decisao = decideCharge({
      planCode: plano.id,
      priceCents: plano.price_cents,
      status: a.status as "ativa" | "pendente" | "vencida" | "cancelada",
      billingDay: a.billing_day,
      chargedPeriods: periodos.get(a.workspace_id) ?? [],
      now: agora,
    });

    if (!decisao.charge) {
      linhas.push({
        ...base,
        planoNome: plano.name,
        valorCents: plano.price_cents,
        ciclo: cycleFor(agora, a.billing_day),
        resultado: "pulou",
        motivo: decisao.reason,
      });
      continue;
    }

    const comum = {
      ...base,
      planoNome: plano.name,
      valorCents: decisao.amountCents,
      ciclo: decisao.cycle,
    };

    if (opts.simulacao) {
      linhas.push({ ...comum, resultado: "simulado" });
      continue;
    }

    // Cobrança manual nasce sem QR: a fatura existe, o dono envia por fora e
    // registra o pagamento. Com gateway, o Pix é criado antes de gravar —
    // fatura sem meio de pagamento seria uma linha que ninguém consegue
    // pagar.
    let providerChargeId: string | null = null;
    let qrCode: string | null = null;
    let copiaECola: string | null = null;
    let expiraEm: string | null = null;

    try {
      if (modo.modo === "gateway") {
        const pix = await modo.gateway.createPixCharge({
          amountCents: decisao.amountCents,
          description: `${plano.name} · ${decisao.cycle.start}`,
          expiresInSeconds: Math.floor(
            (chargeExpiresAt(agora).getTime() - agora.getTime()) / 1000
          ),
          reference: `${a.workspace_id}:${decisao.cycle.start}`,
        });
        providerChargeId = pix.providerChargeId;
        qrCode = pix.qrCode;
        copiaECola = pix.copiaECola;
        expiraEm = pix.expiresAt.toISOString();
      } else {
        expiraEm = chargeExpiresAt(agora).toISOString();
      }

      const { error } = await db.from("subscription_charge").insert({
        workspace_id: a.workspace_id,
        plan_id: plano.id,
        plan_name: plano.name,
        amount_cents: decisao.amountCents,
        period_start: decisao.cycle.start,
        period_end: decisao.cycle.end,
        status: "aberta",
        provider: provedor,
        provider_charge_id: providerChargeId,
        qr_code: qrCode,
        copia_e_cola: copiaECola,
        expires_at: expiraEm,
      });

      if (error) {
        // 23505 = violação de unicidade. É o índice (workspace, period_start)
        // fazendo exatamente o trabalho dele: alguém já cobrou este ciclo,
        // provavelmente uma execução anterior. Não é erro, é idempotência.
        if (error.code === "23505") {
          linhas.push({ ...comum, resultado: "ja_existia" });
        } else {
          linhas.push({ ...comum, resultado: "erro", motivo: error.message });
        }
        continue;
      }

      linhas.push({ ...comum, resultado: "criada" });
    } catch (e) {
      linhas.push({
        ...comum,
        resultado: "erro",
        motivo: e instanceof Error ? e.message : "falha desconhecida",
      });
    }
  }

  const conta = (r: ResultadoDaLinha["resultado"]) =>
    linhas.filter((l) => l.resultado === r).length;

  const cobraveis = linhas.filter(
    (l) => l.resultado === "simulado" || l.resultado === "criada"
  );

  return {
    simulacao: opts.simulacao,
    provedor,
    executadoEm: agora.toISOString(),
    avaliadas: linhas.length,
    aCobrar: cobraveis.length,
    criadas: conta("criada"),
    jaExistiam: conta("ja_existia"),
    erros: conta("erro"),
    totalCents: cobraveis.reduce((s, l) => s + l.valorCents, 0),
    linhas,
  };
}
