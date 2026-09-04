import { IconBan, IconCheck } from "@tabler/icons-react";

/**
 * A etapa em que a demanda está.
 *
 * **O TAFLOW não tem campo de status.** O que existe é: `completed_at`,
 * `cancelled_at` e a COLUNA do quadro do setor. Este chip mostra os três na
 * ordem certa — concluída e cancelada ganham do nome da coluna, porque uma
 * demanda concluída parada na coluna "Em produção" está concluída, e é isso
 * que quem lê precisa saber.
 *
 * Sem coluna, o chip diz "Sem etapa" em vez de ficar vazio: espaço em
 * branco numa coluna de tabela é ambíguo — pode ser dado faltando ou falha
 * de carregamento.
 *
 * Baixo contraste de propósito. São seis ou sete etapas numa tela cheia de
 * linhas; chips saturados competiriam com o título, que é a informação
 * principal.
 */
export function TaskStatusChip({
  coluna,
  concluida,
  cancelada,
}: {
  /** Nome da coluna do quadro, quando a demanda está em uma. */
  coluna?: string | null;
  concluida: boolean;
  cancelada: boolean;
}) {
  if (cancelada) {
    return (
      <span className="bg-sunken text-fg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap">
        <IconBan size={12} stroke={2} aria-hidden />
        Cancelada
      </span>
    );
  }

  if (concluida) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap"
        style={{
          background: "var(--status-positive-bg)",
          color: "var(--status-positive-fg)",
        }}
      >
        <IconCheck size={12} stroke={2.5} aria-hidden />
        Concluída
      </span>
    );
  }

  return (
    <span className="bg-sunken text-fg-secondary inline-flex max-w-36 items-center rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap">
      <span className="truncate">{coluna || "Sem etapa"}</span>
    </span>
  );
}
