import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { FUSO_PADRAO } from "@/lib/dates/day";

import {
  CHARGE_TTL_DAYS,
  type Cycle,
  chargeExpiresAt,
  cycleFor,
  decideCharge,
} from "./cycle";
import { nomeDoProvedor, resolveProvider } from "./provider";

/**
 * A cobrança pela ótica de QUEM PAGA.
 *
 * O `run.ts` decide e emite para todo mundo, e é rotina de plataforma. Este
 * módulo é o outro lado: uma empresa olhando a própria conta.
 *
 * **A empresa NUNCA cria uma cobrança arbitrária.** Ela pede a do ciclo
 * corrente, e quem decide se existe algo a pagar é `decideCharge` — a mesma
 * função da rotina automática, com as mesmas travas: plano vitalício não
 * gera, plano gratuito não gera, período já cobrado não gera de novo. Se o
 * valor viesse do pedido, bastaria alterar a requisição para pagar um real
 * e ter o mês inteiro.
 *
 * A idempotência real é o índice único `(workspace_id, period_start)` no
 * banco. Clicar duas vezes devolve a mesma cobrança, não duas.
 */

export type EstadoDaCobranca =
  | {
      estado: "sem_cobranca";
      motivo: string;
      /**
       * A tela deve oferecer o botão de gerar?
       *
       * **Existe porque ela oferecia sempre**, e num plano vitalício o clique
       * respondia — corretamente — "não há cobrança". Botão que a regra
       * recusa é pior que ausência de botão: quem clica aprende que a tela
       * não sabe do que está falando. Encontrado abrindo a tela em
       * 8/set/2026.
       */
      podeGerar: boolean;
    }
  | { estado: "manual"; motivo: string }
  | {
      estado: "aberta";
      id: string;
      valorCents: number;
      copiaECola: string | null;
      qrCode: string | null;
      expiraEm: string | null;
      periodo: { inicio: string; fim: string };
    }
  | { estado: "paga"; pagaEm: string | null; acessoAte: string | null };

type Avaliacao =
  | {
      cobra: true;
      plano: { id: string; name: string };
      ciclo: Cycle;
      valorCents: number;
    }
  | {
      cobra: false;
      motivo: string;
      /** Ciclo corrente. `null` quando nem plano existe para calculá-lo. */
      ciclo: Cycle | null;
      /** O período já tem cobrança, e ela não está aberta: paga ou vencida. */
      jaCobrado: boolean;
    };

/**
 * O que o ciclo corrente pede — decidido UMA vez, para os dois caminhos.
 *
 * A tela (`estadoAtual`) e o clique (`gerarCobranca`) precisam dar a mesma
 * resposta. Enquanto cada uma tinha a sua própria conta, a tela não
 * consultava o plano e oferecia o que o clique recusava.
 */
async function avaliarCiclo(
  db: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  agora: Date
): Promise<Avaliacao> {
  const nao = (motivo: string): Avaliacao => ({
    cobra: false,
    motivo,
    ciclo: null,
    jaCobrado: false,
  });

  const [{ data: assinatura }, { data: ws }] = await Promise.all([
    db
      .from("subscription")
      .select("plan_id, status, billing_day")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    db.from("workspace").select("plan_id").eq("id", workspaceId).maybeSingle(),
  ]);

  if (!assinatura) return nao("Esta empresa não tem assinatura configurada.");

  // A mesma precedência do `run.ts`: o plano da assinatura vence o do
  // workspace. Duas fontes para a mesma pergunta é como elas divergem.
  const planId = assinatura.plan_id ?? ws?.plan_id;
  if (!planId) return nao("Nenhum plano definido.");

  const { data: plano } = await db
    .from("billing_plan")
    .select("id, name, price_cents, vitalicio")
    .eq("id", planId)
    .maybeSingle();

  if (!plano) return nao("Plano não encontrado.");

  const { data: jaCobradas } = await db
    .from("subscription_charge")
    .select("period_start")
    .eq("workspace_id", workspaceId);

  const decisao = decideCharge({
    // A fatura guarda o NOME copiado, não o código: plano renomeado não
    // reescreve fatura antiga. `planCode` aqui é só rótulo da decisão.
    planCode: plano.id,
    priceCents: plano.price_cents,
    vitalicio: plano.vitalicio,
    status: assinatura.status as "ativa" | "pendente" | "vencida" | "cancelada",
    billingDay: assinatura.billing_day,
    chargedPeriods: (jaCobradas ?? []).map((c) => c.period_start),
    now: agora,
    fuso: FUSO_PADRAO,
  });

  if (decisao.charge) {
    return {
      cobra: true,
      plano: { id: plano.id, name: plano.name },
      ciclo: decisao.cycle,
      valorCents: decisao.amountCents,
    };
  }

  return {
    cobra: false,
    motivo: motivoLegivel(decisao.reason),
    ciclo: cycleFor(agora, assinatura.billing_day, FUSO_PADRAO),
    jaCobrado: decisao.reason === "já cobrado",
  };
}

/** O que a empresa tem em aberto hoje, sem criar nada. */
export async function estadoAtual(
  workspaceId: string,
  agora = new Date()
): Promise<EstadoDaCobranca> {
  const db = createAdminClient();

  const { data: aberta } = await db
    .from("subscription_charge")
    .select(
      "id, amount_cents, copia_e_cola, qr_code, expires_at, period_start, period_end"
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "aberta")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aberta) {
    return {
      estado: "aberta",
      id: aberta.id,
      valorCents: aberta.amount_cents,
      copiaECola: aberta.copia_e_cola,
      qrCode: aberta.qr_code,
      expiraEm: aberta.expires_at,
      periodo: { inicio: aberta.period_start, fim: aberta.period_end },
    };
  }

  const aval = await avaliarCiclo(db, workspaceId, agora);

  if (aval.cobra) {
    return {
      estado: "sem_cobranca",
      motivo: "A cobrança deste período ainda não foi gerada.",
      podeGerar: true,
    };
  }

  // "Já cobrado" sem nada aberto: ou o ciclo está pago, ou a cobrança dele
  // venceu. São situações opostas para quem lê, e a diferença está na linha
  // DESTE ciclo — não na cobrança mais recente, qualquer que seja.
  //
  // **Olhar a mais recente era um defeito**: quem pagou agosto e chegou em
  // setembro ainda sem fatura via "Pagamento em dia" ao lado de uma data de
  // acesso já vencida, e a conta do mês corrente sumia da tela.
  if (aval.jaCobrado && aval.ciclo) {
    const { data: doCiclo } = await db
      .from("subscription_charge")
      .select("status, paid_at")
      .eq("workspace_id", workspaceId)
      .eq("period_start", aval.ciclo.start)
      .maybeSingle();

    if (doCiclo?.status === "paga") {
      const { data: ws } = await db
        .from("workspace")
        .select("access_expires_at")
        .eq("id", workspaceId)
        .maybeSingle();

      return {
        estado: "paga",
        pagaEm: doCiclo.paid_at,
        acessoAte: ws?.access_expires_at ?? null,
      };
    }

    // Vencida ou cancelada. O índice único `(workspace_id, period_start)`
    // impede gerar outra para o mesmo ciclo, então oferecer o botão aqui
    // seria oferecer um erro.
    return {
      estado: "sem_cobranca",
      motivo:
        "A cobrança deste período venceu. Peça uma nova a quem administra o sistema.",
      podeGerar: false,
    };
  }

  return { estado: "sem_cobranca", motivo: aval.motivo, podeGerar: false };
}

/**
 * Gera (ou devolve) a cobrança do ciclo corrente.
 *
 * Se já existe uma aberta, devolve ELA — sem falar com o provedor. É o que
 * torna o botão seguro de clicar duas vezes.
 */
export async function gerarCobranca(
  workspaceId: string,
  agora = new Date()
): Promise<EstadoDaCobranca> {
  const db = createAdminClient();

  const jaTem = await estadoAtual(workspaceId, agora);
  // Tudo que não seja "dá para gerar" volta como está: é a MESMA frase que a
  // tela já mostrava. O clique não é uma segunda opinião.
  if (jaTem.estado !== "sem_cobranca" || !jaTem.podeGerar) return jaTem;

  // Avalia de novo em vez de confiar no que a tela leu: entre carregar a
  // página e clicar, o cron pode ter emitido a fatura ou o plano pode ter
  // mudado.
  const aval = await avaliarCiclo(db, workspaceId, agora);
  if (!aval.cobra) {
    return { estado: "sem_cobranca", motivo: aval.motivo, podeGerar: false };
  }

  const modo = resolveProvider();
  if (modo.modo === "manual") {
    // Sem provedor não há QR para mostrar. Dizer isso é melhor que criar
    // uma fatura que a tela não sabe pagar.
    return {
      estado: "manual",
      motivo:
        "A cobrança automática ainda não está ligada. Combine o pagamento com quem administra o sistema.",
    };
  }

  // UM prazo só, usado nos dois lados. Pedir à EFI uma expiração diferente
  // da que a fatura registra criaria uma janela em que a tela mostra um QR
  // que o banco já recusa — ou o contrário.
  const expiraEm = chargeExpiresAt(agora);

  // A linha nasce ANTES da ida ao provedor, com o índice único segurando a
  // corrida: dois cliques simultâneos, e o segundo esbarra no índice em vez
  // de criar uma segunda cobrança na EFI.
  const { data: criada, error: erroCriar } = await db
    .from("subscription_charge")
    .insert({
      workspace_id: workspaceId,
      plan_id: aval.plano.id,
      plan_name: aval.plano.name,
      amount_cents: aval.valorCents,
      period_start: aval.ciclo.start,
      period_end: aval.ciclo.end,
      provider: nomeDoProvedor(modo),
      status: "aberta",
      expires_at: expiraEm.toISOString(),
    })
    .select("id")
    .single();

  if (erroCriar) {
    if (erroCriar.code === "23505") {
      // O outro clique ganhou. Devolve o que ele criou.
      return estadoAtual(workspaceId, agora);
    }
    return {
      estado: "sem_cobranca",
      motivo: erroCriar.message,
      podeGerar: false,
    };
  }

  const cobranca = await modo.gateway.createPixCharge({
    amountCents: aval.valorCents,
    description: `TAFLOW ${aval.plano.name}`,
    expiresInSeconds: CHARGE_TTL_DAYS * 86_400,
    reference: criada.id,
  });

  await db
    .from("subscription_charge")
    .update({
      provider_charge_id: cobranca.providerChargeId,
      qr_code: cobranca.qrCode || null,
      copia_e_cola: cobranca.copiaECola || null,
    })
    .eq("id", criada.id);

  return {
    estado: "aberta",
    id: criada.id,
    valorCents: aval.valorCents,
    copiaECola: cobranca.copiaECola || null,
    qrCode: cobranca.qrCode || null,
    expiraEm: expiraEm.toISOString(),
    periodo: { inicio: aval.ciclo.start, fim: aval.ciclo.end },
  };
}

/** O motivo do `decideCharge`, dito para quem paga e não para quem opera. */
function motivoLegivel(razao: string): string {
  switch (razao) {
    case "plano vitalício":
      return "Seu plano é vitalício: não há cobrança.";
    case "plano gratuito":
      return "Seu plano não tem cobrança.";
    case "cancelada":
      return "Sua assinatura está cancelada.";
    case "já cobrado":
      return "O período atual já foi cobrado.";
    default:
      return "Nada a pagar no momento.";
  }
}
