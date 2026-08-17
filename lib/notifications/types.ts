import type { Notification, NotificationKind } from "@/types/database";

/**
 * Duas naturezas convivem no sino.
 *
 * `alerta` é estado atual, calculado na leitura: some sozinho quando a
 * condição acaba (você entrega a demanda, o contrato é renovado). Não tem
 * "marcar como lida" porque não há o que ler — há o que resolver.
 *
 * `evento` é fato passado, gravado por trigger: alguém te mencionou, alguém
 * te atribuiu. Fica até você marcar como lida.
 */
export type AlertKind =
  | "atrasada"
  | "prazo_hoje"
  | "prazo_proximo"
  | "contrato_vencendo"
  | "parcela_vencendo";

/** Onde o item leva ao ser clicado. */
export type FeedTarget =
  | { type: "task"; id: string }
  | { type: "contract"; id: string }
  | { type: "finance"; id: string };

export type DerivedAlert = {
  /** Estável entre renders: mesma condição, mesma chave. */
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  target: FeedTarget;
  /** Ordena o bloco: menor primeiro. Atraso vem antes de prazo próximo. */
  weight: number;
};

export type FeedEvent = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string | null;
  target: FeedTarget;
  readAt: string | null;
  createdAt: string;
};

export type FeedItem =
  | ({ nature: "alerta" } & DerivedAlert)
  | ({ nature: "evento" } & FeedEvent);

export function toFeedEvent(row: Notification): FeedEvent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    detail: row.body,
    target: { type: "task", id: row.entity_id },
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
