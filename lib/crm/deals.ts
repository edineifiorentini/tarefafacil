import type { Deal, PipelineStage } from "@/types/database";

/**
 * Contas do funil.
 *
 * Tudo aqui é função pura sobre as linhas que já vieram do banco: o quadro
 * carrega as negociações uma vez e as somas saem da mesma lista, sem uma
 * consulta por coluna.
 */

export type StageTotal = {
  count: number;
  /** Soma em centavos. Negociação sem preço entra na contagem, não na soma. */
  cents: number;
};

/** Negociações de cada etapa, já na ordem em que aparecem na coluna. */
export function dealsByStage(deals: Deal[]): Map<string, Deal[]> {
  const mapa = new Map<string, Deal[]>();
  for (const d of deals) {
    const lista = mapa.get(d.stage_id);
    if (lista) lista.push(d);
    else mapa.set(d.stage_id, [d]);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.position - b.position);
  }
  return mapa;
}

/** Quantas e quanto por etapa — é o que vai no cabeçalho da coluna. */
export function stageTotals(deals: Deal[]): Map<string, StageTotal> {
  const mapa = new Map<string, StageTotal>();
  for (const d of deals) {
    const atual = mapa.get(d.stage_id) ?? { count: 0, cents: 0 };
    atual.count += 1;
    atual.cents += d.amount_cents ?? 0;
    mapa.set(d.stage_id, atual);
  }
  return mapa;
}

/**
 * Quanto ainda está em jogo.
 *
 * Ganho e perdido ficam de fora: somá-los transformaria o número em
 * "histórico de tudo que passou por aqui", que sobe para sempre e não ajuda
 * ninguém a decidir nada hoje.
 */
export function openTotalCents(deals: Deal[], stages: PipelineStage[]): number {
  const abertas = new Set(
    stages.filter((s) => s.kind === "aberta").map((s) => s.id)
  );
  return deals
    .filter((d) => abertas.has(d.stage_id))
    .reduce((soma, d) => soma + (d.amount_cents ?? 0), 0);
}

/**
 * O desfecho que a etapa impõe.
 *
 * Quem decide é o `kind`, nunca o nome: o dono pode renomear "Fechado" para
 * "Assinado" sem que o sistema pare de marcar a data de ganho.
 */
export function outcomeFor(stage: PipelineStage | undefined): {
  won_at: string | null;
  lost_at: string | null;
} {
  const agora = new Date().toISOString();
  if (stage?.kind === "ganho") return { won_at: agora, lost_at: null };
  if (stage?.kind === "perdido") return { won_at: null, lost_at: agora };
  // Voltar para uma etapa aberta desfaz o desfecho. Negociação que volta
  // para "Em negociação" e continua marcada como ganha mentiria no total.
  return { won_at: null, lost_at: null };
}

/** Taxa de conversão sobre o que já foi decidido — em aberto não conta. */
export function winRate(deals: Deal[]): number | null {
  const ganhas = deals.filter((d) => d.won_at).length;
  const perdidas = deals.filter((d) => d.lost_at).length;
  const decididas = ganhas + perdidas;
  if (decididas === 0) return null;
  return Math.round((ganhas / decididas) * 100);
}
