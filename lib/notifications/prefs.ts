import type { NotificationPreference } from "@/types/database";

import type { AlertKind, FeedItem } from "./types";

/**
 * Filtro do sino pela preferência de quem está olhando.
 *
 * Função pura sobre a lista já montada: a preferência decide o que APARECE,
 * não o que é gravado. Quem foi mencionado foi mencionado — desligar aqui é
 * dizer "não me mostre", e religar traz o histórico de volta em vez de
 * revelar um buraco.
 */

/** Tudo ligado. É o que vale para quem nunca abriu a tela de preferências. */
export const DEFAULT_PREFS = {
  mencao: true,
  atribuicao: true,
  comentario: true,
  aprovacao: true,
  prazos: true,
  contratos: true,
  financeiro: true,
} as const;

export type Prefs = {
  mencao: boolean;
  atribuicao: boolean;
  comentario: boolean;
  aprovacao: boolean;
  prazos: boolean;
  contratos: boolean;
  financeiro: boolean;
};

export function prefsFrom(
  row: NotificationPreference | null | undefined
): Prefs {
  if (!row) return { ...DEFAULT_PREFS };
  return {
    mencao: row.mencao,
    atribuicao: row.atribuicao,
    comentario: row.comentario,
    aprovacao: row.aprovacao,
    prazos: row.prazos,
    contratos: row.contratos,
    financeiro: row.financeiro,
  };
}

/** A que chave de preferência cada alerta responde. */
const ALERT_GROUP: Record<AlertKind, keyof Prefs> = {
  atrasada: "prazos",
  prazo_hoje: "prazos",
  prazo_proximo: "prazos",
  contrato_vencendo: "contratos",
  parcela_vencendo: "financeiro",
};

export function allowsAlert(prefs: Prefs, kind: AlertKind): boolean {
  return prefs[ALERT_GROUP[kind]];
}

export function filterFeed(feed: FeedItem[], prefs: Prefs): FeedItem[] {
  return feed.filter((item) =>
    item.nature === "alerta" ? allowsAlert(prefs, item.kind) : prefs[item.kind]
  );
}
