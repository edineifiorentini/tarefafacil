// O outro lado do motor: o que acontece quando o dinheiro entra, e o que
// acontece quando não entra. Só servidor.
//
// `run.ts` cria a fatura; este arquivo a fecha.

import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";

import { accessUntil } from "./cycle";

export type ResultadoDoPagamento =
  | { ok: true; acessoAte: string }
  | { ok: false; erro: string; mensagem: string };

/**
 * Registra o pagamento de uma fatura e empurra o acesso.
 *
 * A ORDEM importa e não é arbitrária:
 *
 * 1. marca a fatura como paga — é o fato;
 * 2. empurra `access_expires_at` — é a consequência que o cliente sente;
 * 3. devolve a assinatura para `ativa` — é o estado derivado.
 *
 * Se a 2 falhar depois da 1, o cliente pagou e não recebeu acesso: visível,
 * reclamado e consertável repetindo a ação. Na ordem inversa, o acesso seria
 * empurrado por um pagamento que talvez não tenha sido gravado — invisível,
 * e ninguém reclama de ganhar acesso.
 *
 * A data de validade sai de `accessUntil`, que é fim do período MAIS a
 * carência. A regra de carência mora num lugar só de propósito.
 */
export async function registrarPagamento(params: {
  chargeId: string;
  /** Quanto entrou de fato. Pagamento parcial existe. */
  valorCents?: number;
  /** Quando entrou. Padrão: agora. */
  pagoEm?: string;
  autor: string;
  motivo: string;
}): Promise<ResultadoDoPagamento> {
  const db = createAdminClient();

  const { data: fatura } = await db
    .from("subscription_charge")
    .select(
      "id, workspace_id, plan_name, amount_cents, period_start, period_end, status"
    )
    .eq("id", params.chargeId)
    .maybeSingle();

  if (!fatura) {
    return { ok: false, erro: "not_found", mensagem: "Fatura não encontrada" };
  }
  if (fatura.status === "paga") {
    // Idempotência do lado humano: dois cliques em "registrar pagamento" não
    // podem empurrar o acesso dois meses.
    return {
      ok: false,
      erro: "ja_paga",
      mensagem: "Esta fatura já está registrada como paga",
    };
  }
  if (fatura.status === "cancelada") {
    return {
      ok: false,
      erro: "cancelada",
      mensagem: "Fatura cancelada não recebe pagamento",
    };
  }

  const pagoEm = params.pagoEm ?? new Date().toISOString();
  const valor = params.valorCents ?? fatura.amount_cents;

  const { error: erroFatura } = await db
    .from("subscription_charge")
    .update({ status: "paga", paid_at: pagoEm, paid_amount_cents: valor })
    .eq("id", fatura.id)
    // Só fecha se ainda estiver aberta: se duas pessoas clicarem ao mesmo
    // tempo, a segunda não encontra linha e não empurra o acesso de novo.
    .eq("status", "aberta");
  if (erroFatura) {
    return { ok: false, erro: "falhou", mensagem: erroFatura.message };
  }

  const acessoAte = accessUntil({
    start: fatura.period_start,
    end: fatura.period_end,
  });

  const { error: erroAcesso } = await db
    .from("workspace")
    .update({ access_expires_at: acessoAte })
    .eq("id", fatura.workspace_id);
  if (erroAcesso) {
    return {
      ok: false,
      erro: "acesso",
      mensagem:
        "O pagamento foi gravado, mas o acesso não foi estendido. Repita a ação.",
    };
  }

  await db
    .from("subscription")
    .update({ status: "ativa" })
    .eq("workspace_id", fatura.workspace_id);

  await registrarEventoDePlataforma({
    autor: params.autor,
    acao: "alterou",
    entidade: "subscription_charge",
    entidadeId: fatura.id,
    resumo: `registrou o pagamento de ${fatura.plan_name} (${fatura.period_start})`,
    detalhes: {
      motivo: params.motivo,
      valorCents: valor,
      pagoEm,
      acessoAte,
    },
  });

  return { ok: true, acessoAte };
}

/**
 * Fecha faturas abertas que passaram da validade.
 *
 * NÃO bloqueia ninguém: expirar a fatura só diz que aquele meio de pagamento
 * não vale mais. Quem decide o acesso é `access_expires_at`, e ele já carrega
 * a carência. Misturar as duas coisas faria uma fatura vencida derrubar
 * cliente que ainda está dentro do prazo.
 */
export async function expirarVencidas(agora = new Date()): Promise<number> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("subscription_charge")
    .update({ status: "expirada" })
    .eq("status", "aberta")
    .lt("expires_at", agora.toISOString())
    .select("id");
  if (error) return 0;
  return (data ?? []).length;
}

/**
 * Encerra as assinaturas cujo cancelamento agendado venceu.
 *
 * É o par de `cancel_at`: sem alguém aplicando a data, o agendamento seria
 * só uma anotação bonita que nunca acontece.
 */
export async function aplicarCancelamentosAgendados(
  agora = new Date()
): Promise<number> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("subscription")
    .update({ status: "cancelada", canceled_at: agora.toISOString() })
    .lt("cancel_at", agora.toISOString())
    .neq("status", "cancelada")
    .select("workspace_id");
  if (error) return 0;

  for (const linha of (data ?? []) as { workspace_id: string }[]) {
    await registrarEventoDePlataforma({
      autor: "sistema",
      acao: "alterou",
      entidade: "subscription",
      entidadeId: linha.workspace_id,
      resumo: "encerrou a assinatura no cancelamento agendado",
      detalhes: { motivo: "cancelamento agendado venceu" },
    });
  }

  return (data ?? []).length;
}
