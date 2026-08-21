import { isSameDay, isToday, isYesterday, parseISO } from "date-fns";

import type { ChatMessage, ChatReadState } from "@/types/database";

/**
 * Regras puras do chat: quanta coisa nova tem em cada canal e como a
 * conversa se agrupa na tela.
 *
 * Não lidas saem de `last_read_at` por canal, não de uma linha de leitura
 * por mensagem: a pergunta é "tem coisa nova desde quando eu saí?", e uma
 * data responde isso sem crescer com o volume.
 */

/** Teto do contador. Passou disso, o número exato não muda a decisão. */
const MAX_BADGE = 99;

export type ChannelUnread = {
  /** Mensagens novas desde a última leitura. */
  count: number;
  /** Alguma delas menciona você — o canal merece destaque, não só número. */
  mentionsMe: boolean;
};

/**
 * Conta por canal. Mensagem própria nunca conta: você acabou de escrever.
 * Aviso de sistema conta — "criaram uma demanda no seu setor" é justamente
 * o que a pessoa quer ver ao voltar.
 */
export function unreadByChannel(
  messages: ChatMessage[],
  readState: ChatReadState[],
  myId: string | null
): Map<string, ChannelUnread> {
  const lastRead = new Map(
    readState.map((r) => [r.channel_id, r.last_read_at])
  );
  const out = new Map<string, ChannelUnread>();

  for (const msg of messages) {
    if (myId && msg.author_id === myId) continue;

    const marca = lastRead.get(msg.channel_id);
    // Canal nunca aberto: tudo que existe é novo.
    if (marca && msg.created_at <= marca) continue;

    const atual = out.get(msg.channel_id) ?? { count: 0, mentionsMe: false };
    atual.count += 1;
    if (myId && msg.mentioned_user_ids.includes(myId)) atual.mentionsMe = true;
    out.set(msg.channel_id, atual);
  }

  return out;
}

/** Rótulo do contador. Acima do teto vira "99+". */
export function badgeLabel(count: number): string {
  return count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
}

export function totalUnread(unread: Map<string, ChannelUnread>): number {
  let total = 0;
  for (const u of unread.values()) total += u.count;
  return total;
}

export type MessageGroup = {
  /** Cabeçalho do dia: "Hoje", "Ontem" ou a data. */
  dayLabel: string;
  messages: ChatMessage[];
};

function dayLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/**
 * Agrupa por dia, na ordem em que se lê (mais antigo primeiro). A consulta
 * traz do mais recente para o mais antigo — é o que permite pegar "as 50
 * últimas" —, então a inversão acontece aqui, num lugar testável.
 */
export function groupByDay(messages: ChatMessage[]): MessageGroup[] {
  const ordenadas = [...messages].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  const grupos: MessageGroup[] = [];
  for (const msg of ordenadas) {
    const ultimo = grupos[grupos.length - 1];
    const mesmoDia =
      ultimo &&
      isSameDay(
        parseISO(ultimo.messages[0].created_at),
        parseISO(msg.created_at)
      );
    if (mesmoDia) ultimo.messages.push(msg);
    else grupos.push({ dayLabel: dayLabel(msg.created_at), messages: [msg] });
  }
  return grupos;
}

/**
 * Mensagens seguidas da mesma pessoa em poucos minutos são uma fala só:
 * repetir avatar e nome a cada linha polui a leitura.
 */
const AGRUPA_MINUTOS = 5;

export function isContinuation(
  msg: ChatMessage,
  anterior: ChatMessage | undefined
): boolean {
  if (!anterior) return false;
  if (msg.kind !== "humano" || anterior.kind !== "humano") return false;
  if (msg.author_id !== anterior.author_id) return false;
  const diff =
    parseISO(msg.created_at).getTime() -
    parseISO(anterior.created_at).getTime();
  return diff <= AGRUPA_MINUTOS * 60_000;
}
