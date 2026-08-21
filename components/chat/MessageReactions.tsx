"use client";

import { IconMoodPlus } from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { REACTIONS, type ReactionSummary } from "@/lib/chat/reactions";

/**
 * Fichas de reação de uma mensagem, mais o seletor.
 *
 * O seletor só aparece no hover ou no foco — mesma regra do botão de
 * responder. As fichas existentes ficam sempre visíveis: elas são conteúdo
 * da conversa, não controle.
 */
export function MessageReactions({
  summaries,
  onToggle,
  messageLabel,
}: {
  summaries: ReactionSummary[];
  onToggle: (emoji: string, mine: boolean) => void;
  /** Para o leitor de tela saber de que mensagem é a reação. */
  messageLabel: string;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {summaries.map((s) => (
        <button
          key={s.emoji}
          type="button"
          onClick={() => onToggle(s.emoji, s.mine)}
          aria-pressed={s.mine}
          aria-label={`${s.emoji}, ${s.count} ${
            s.count === 1 ? "reação" : "reações"
          }${s.mine ? ", incluindo a sua" : ""}`}
          className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] ${
            s.mine
              ? "bg-selected text-fg-link border-[var(--brand-600)]"
              : "border-line bg-sunken text-fg-secondary hover:bg-hover"
          }`}
        >
          <span aria-hidden>{s.emoji}</span>
          <span className="tnum">{s.count}</span>
        </button>
      ))}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Reagir a ${messageLabel}`}
            className="text-fg-muted hover:bg-hover hover:text-fg data-[state=open]:bg-sunken inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity [transition-duration:var(--dur-fast)] group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <IconMoodPlus size={15} stroke={1.75} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="tf-glass-strong z-50 flex gap-0.5 rounded-full p-1 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
          >
            {REACTIONS.map((emoji) => {
              const minha =
                summaries.find((s) => s.emoji === emoji)?.mine ?? false;
              return (
                <DropdownMenu.Item
                  key={emoji}
                  onSelect={() => onToggle(emoji, minha)}
                  aria-label={emoji}
                  className={`data-[highlighted]:bg-hover inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[length:var(--text-body-size)] outline-none ${
                    minha ? "bg-selected" : ""
                  }`}
                >
                  {emoji}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
