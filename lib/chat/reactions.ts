import type { ChatMessageReaction } from "@/types/database";

/**
 * O vocabulário de reações.
 *
 * Curto de propósito: sete opções cabem numa linha, são reconhecíveis de
 * relance e não viram uma segunda linguagem dentro da conversa. Os seis
 * primeiros são os do WhatsApp, que é onde a equipe já aprendeu o
 * significado; 👀 entra porque numa ferramenta de trabalho "estou vendo
 * isso" é a resposta mais útil que existe.
 *
 * Esta lista precisa bater EXATAMENTE com o `check` da migration 0055 —
 * inclusive o seletor de variação do ❤️. Emoji fora da lista é recusado
 * pelo banco, não pela interface.
 */
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "👀"] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

/** Como cada emoji aparece na mensagem: quantos, e se eu estou entre eles. */
export type ReactionSummary = {
  emoji: string;
  count: number;
  /** Reagi com este emoji — a ficha fica marcada e o clique desfaz. */
  mine: boolean;
};

/**
 * Agrupa as reações de UMA mensagem.
 *
 * A ordem é a de `REACTIONS`, nunca a de contagem: ficha que pula de lugar
 * quando alguém reage faz a pessoa clicar no emoji errado. Emoji que o banco
 * conhece e esta lista não (por exemplo, durante um deploy no meio de uma
 * migration) vai para o fim, em vez de sumir.
 */
export function groupReactions(
  rows: ChatMessageReaction[],
  myId: string | null
): ReactionSummary[] {
  const contagem = new Map<string, { count: number; mine: boolean }>();
  for (const r of rows) {
    const atual = contagem.get(r.emoji) ?? { count: 0, mine: false };
    atual.count += 1;
    if (myId && r.user_id === myId) atual.mine = true;
    contagem.set(r.emoji, atual);
  }

  const ordem = (emoji: string) => {
    const i = (REACTIONS as readonly string[]).indexOf(emoji);
    return i === -1 ? REACTIONS.length : i;
  };

  return [...contagem.entries()]
    .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
    .sort((a, b) => ordem(a.emoji) - ordem(b.emoji));
}

/**
 * Agrupa as reações do canal inteiro por mensagem, de uma vez.
 *
 * A conversa carrega até 50 mensagens por página; chamar `groupReactions`
 * dentro do laço de render varreria a lista inteira por mensagem.
 */
export function reactionsByMessage(
  rows: ChatMessageReaction[],
  myId: string | null
): Map<string, ReactionSummary[]> {
  const porMensagem = new Map<string, ChatMessageReaction[]>();
  for (const r of rows) {
    const lista = porMensagem.get(r.message_id);
    if (lista) lista.push(r);
    else porMensagem.set(r.message_id, [r]);
  }

  const saida = new Map<string, ReactionSummary[]>();
  for (const [id, lista] of porMensagem) {
    saida.set(id, groupReactions(lista, myId));
  }
  return saida;
}
