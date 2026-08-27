"use client";

import { Tooltip } from "radix-ui";
import { IconInfoCircle } from "@tabler/icons-react";

/**
 * Dica curta ao lado de um rótulo — serve para dizer COMO um número é
 * calculado sem gastar uma linha permanente na tela.
 *
 * É um `<button>`, não um `title` nativo: `title` não abre pelo teclado, não
 * abre no toque e o leitor de tela trata de forma inconsistente. Aqui abre no
 * foco, no hover e no toque, e fecha no Escape.
 *
 * Vidro por decisão de direção visual — tooltip é uma das superfícies em que
 * o efeito é permitido (design 6.7).
 */
export function InfoHint({
  label,
  text,
}: {
  /** O que a dica explica, para o leitor de tela: "Como o MRR é calculado". */
  label: string;
  text: string;
}) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="text-fg-muted hover:text-fg-secondary rounded-full outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <IconInfoCircle size={15} stroke={1.75} aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="start"
            collisionPadding={12}
            className="tf-glass-strong border-line text-fg z-50 max-w-[min(20rem,calc(100vw-2rem))] rounded-sm border px-3 py-2 text-[length:var(--text-caption-size)] leading-[var(--text-caption-line)] shadow-[var(--shadow-glass)] data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=delayed-open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]"
          >
            {text}
            <Tooltip.Arrow className="fill-[var(--surface-glass-strong)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
