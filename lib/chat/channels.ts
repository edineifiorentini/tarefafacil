import type { ChatChannel, ChatMessage, Task } from "@/types/database";

import { todayISO } from "@/lib/notifications/derive";

/**
 * Regras de apresentação dos canais.
 *
 * Três tipos convivem: "Geral" (todo o workspace), grupo (participantes
 * escolhidos) e conversa direta. Setor NÃO é canal — é etiqueta da
 * mensagem, para o assunto se achar por filtro sem partir a conversa em
 * salas que ninguém acompanha.
 *
 * Conversa direta não tem nome guardado: o nome dela é a outra pessoa. Isso
 * se resolve aqui, e não no banco, porque o mesmo canal se chama "Maria"
 * para mim e "João" para ela.
 */

export type ChannelView = {
  channel: ChatChannel;
  /** O que aparece na lista. */
  label: string;
  /** Só em conversa direta: quem está do outro lado. */
  otherUserId: string | null;
};

export function toChannelViews(
  channels: ChatChannel[],
  membersByChannel: Map<string, string[]>,
  myId: string | null,
  nameOf: (userId: string) => string
): ChannelView[] {
  return channels.map((channel) => {
    if (channel.kind !== "direta") {
      return { channel, label: channel.name, otherUserId: null };
    }
    const outro =
      (membersByChannel.get(channel.id) ?? []).find((id) => id !== myId) ??
      null;
    return {
      channel,
      label: outro ? nameOf(outro) : "Conversa",
      otherUserId: outro,
    };
  });
}

/**
 * Ordem da lista: Geral, grupos, conversas diretas — do mais coletivo ao
 * mais pontual, que é a ordem em que se procura.
 */
export function sortChannelViews(views: ChannelView[]): ChannelView[] {
  const peso = { geral: 0, grupo: 1, direta: 2 } as const;
  return [...views].sort((a, b) => {
    const p = peso[a.channel.kind] - peso[b.channel.kind];
    if (p !== 0) return p;
    return a.label.localeCompare(b.label, "pt-BR");
  });
}

/**
 * Filtra a conversa por etiqueta de setor.
 *
 * Mensagem sem etiqueta some quando há filtro: quem filtrou "Obras" quer as
 * de Obras, não o resto misturado. Sem filtro, tudo aparece.
 */
export function filterBySector(
  messages: ChatMessage[],
  sectorId: string | null
): ChatMessage[] {
  if (!sectorId) return messages;
  return messages.filter((m) => m.sector_id === sectorId);
}

/** Setores que aparecem na conversa — vira a lista de filtros oferecidos. */
export function sectorsInUse(messages: ChatMessage[]): string[] {
  const vistos = new Set<string>();
  for (const m of messages) if (m.sector_id) vistos.add(m.sector_id);
  return [...vistos];
}

export type SectorDeadlines = {
  overdue: number;
  today: number;
  soon: number;
};

/** Janela de "logo mais" do resumo. */
const SOON_DAYS = 3;

/**
 * Resumo de prazos de um setor, mostrado quando a conversa está filtrada por
 * ele.
 *
 * Não é o mesmo que o sino: lá o alerta é PESSOAL e por demanda ("sua
 * demanda X atrasou"); aqui é do SETOR e agregado ("2 atrasadas"). Um serve
 * para agir, o outro para a equipe saber como o setor está — por isso os
 * dois convivem sem virar ruído repetido.
 */
export function sectorDeadlines(
  tasks: Task[],
  sectorId: string,
  now: Date
): SectorDeadlines {
  const hoje = todayISO(now);
  const resumo: SectorDeadlines = { overdue: 0, today: 0, soon: 0 };

  for (const t of tasks) {
    if (t.sector_id !== sectorId) continue;
    if (t.completed_at || t.cancelled_at || !t.due_date) continue;

    if (t.due_date < hoje) resumo.overdue += 1;
    else if (t.due_date === hoje) resumo.today += 1;
    else if (diasAte(t.due_date, hoje) <= SOON_DAYS) resumo.soon += 1;
  }

  return resumo;
}

function diasAte(dateISO: string, hoje: string): number {
  const a = Date.parse(`${dateISO}T00:00:00Z`);
  const b = Date.parse(`${hoje}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

/** Frase do resumo. Devolve null quando não há nada a dizer. */
export function deadlinesLabel(resumo: SectorDeadlines): string | null {
  const partes: string[] = [];
  if (resumo.overdue > 0) {
    partes.push(
      resumo.overdue === 1 ? "1 atrasada" : `${resumo.overdue} atrasadas`
    );
  }
  if (resumo.today > 0) {
    partes.push(
      resumo.today === 1 ? "1 vence hoje" : `${resumo.today} vencem hoje`
    );
  }
  if (resumo.soon > 0) {
    partes.push(
      resumo.soon === 1
        ? "1 vence nos próximos dias"
        : `${resumo.soon} vencem nos próximos dias`
    );
  }
  return partes.length === 0 ? null : partes.join(" · ");
}
