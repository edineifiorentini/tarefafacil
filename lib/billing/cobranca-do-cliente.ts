import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { FUSO_PADRAO } from "@/lib/dates/day";

import {
  CHARGE_TTL_DAYS,
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
  | { estado: "sem_cobranca"; motivo: string }
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

/** O que a empresa tem em aberto hoje, sem criar nada. */
export async function estadoAtual(
  workspaceId: string
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

  const { data: paga } = await db
    .from("subscription_charge")
    .select("paid_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "paga")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: ws } = await db
    .from("workspace")
    .select("access_expires_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (paga) {
    return {
      estado: "paga",
      pagaEm: paga.paid_at,
      acessoAte: ws?.access_expires_at ?? null,
    };
  }

  return { estado: "sem_cobranca", motivo: "Nada em aberto no momento." };
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
  const jaTem = await estadoAtual(workspaceId);
  if (jaTem.estado === "aberta") return jaTem;

  const db = createAdminClient();

  const [{ data: assinatura }, { data: ws }] = await Promise.all([
    db
      .from("subscription")
      .select("plan_id, status, billing_day")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    db
      .from("workspace")
      .select("plan_id")
      .eq("id", workspaceId)
      .maybeSingle(),
  ]);

  if (!assinatura) {
    return {
      estado: "sem_cobranca",
      motivo: "Esta empresa não tem assinatura configurada.",
    };
  }

  // A mesma precedência do `run.ts`: o plano da assinatura vence o do
  // workspace. Duas fontes para a mesma pergunta é como elas divergem.
  const planId = assinatura.plan_id ?? ws?.plan_id;
  if (!planId) {
    return { estado: "sem_cobranca", motivo: "Nenhum plano definido." };
  }

  const { data: plano } = await db
    .from("billing_plan")
    .select("id, name, price_cents, vitalicio")
    .eq("id", planId)
    .maybeSingle();

  if (!plano) {
    return { estado: "sem_cobranca", motivo: "Plano não encontrado." };
  }

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

  if (!decisao.charge) {
    return { estado: "sem_cobranca", motivo: motivoLegivel(decisao.reason) };
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

  const ciclo = cycleFor(agora, assinatura.billing_day, FUSO_PADRAO);
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
      plan_id: plano.id,
      plan_name: plano.name,
      amount_cents: decisao.amountCents,
      period_start: ciclo.start,
      period_end: ciclo.end,
      provider: nomeDoProvedor(modo),
      status: "aberta",
      expires_at: expiraEm.toISOString(),
    })
    .select("id")
    .single();

  if (erroCriar) {
    if (erroCriar.code === "23505") {
      // O outro clique ganhou. Devolve o que ele criou.
      return estadoAtual(workspaceId);
    }
    return { estado: "sem_cobranca", motivo: erroCriar.message };
  }

  const cobranca = await modo.gateway.createPixCharge({
    amountCents: decisao.amountCents,
    description: `TAFLOW ${plano.name}`,
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
    valorCents: decisao.amountCents,
    copiaECola: cobranca.copiaECola || null,
    qrCode: cobranca.qrCode || null,
    expiraEm: expiraEm.toISOString(),
    periodo: { inicio: ciclo.start, fim: ciclo.end },
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
