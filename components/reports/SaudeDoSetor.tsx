"use client";

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconExclamationCircle,
  IconHelpCircle,
} from "@tabler/icons-react";
import { Tooltip } from "radix-ui";

import { ROTULO_DE_SAUDE, type Saude } from "@/lib/reports/setores";

/**
 * A classificação de risco de um setor: ícone, texto e cor.
 *
 * **Nunca só cor.** Um selo vermelho e um verde são a mesma coisa para
 * quem tem daltonismo vermelho-verde, que é a forma mais comum — por isso
 * cada nível tem ícone próprio e a palavra escrita. Na forma compacta o
 * texto vira `sr-only`, mas o ícone permanece: a informação não sai da
 * tela, só sai do espaço.
 *
 * A dica diz POR QUE o setor recebeu aquela classificação. Selo sem
 * critério visível é palpite com aparência de dado.
 */

const VISUAL = {
  saudavel: { icone: IconCircleCheck, cor: "var(--status-positive-fg)" },
  atencao: { icone: IconAlertTriangle, cor: "var(--status-due-soon-fg)" },
  critico: { icone: IconExclamationCircle, cor: "var(--status-overdue-fg)" },
  // Cinza, nunca verde: "nada vencido" é menos do que "saudável", e a cor
  // não pode prometer o que o rótulo não promete.
  em_dia: { icone: IconHelpCircle, cor: "var(--text-muted)" },
} as const;

export function SaudeDoSetor({
  saude,
  compacto = false,
}: {
  saude: Saude;
  compacto?: boolean;
}) {
  const { icone: Icone, cor } = VISUAL[saude.nivel];
  const rotulo = ROTULO_DE_SAUDE[saude.nivel];

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            // `relative` NÃO é decoração, é o que segura o motivo dentro do
            // selo. `sr-only` é `position: absolute`, e sem um ancestral
            // posicionado ele resolve contra o bloco inicial da página: o
            // motivo, longo e `nowrap`, esticava o documento para 714px numa
            // tela de 367 e criava rolagem horizontal na página inteira.
            // Medido no navegador em 3/set/2026 — com `relative`, 367px e
            // rolagem zero.
            className="relative inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap"
            style={{
              color: cor,
              background: `color-mix(in srgb, ${cor} 12%, transparent)`,
            }}
          >
            <Icone size={13} stroke={2} aria-hidden />
            <span className={compacto ? "sr-only" : undefined}>{rotulo}</span>
            <span className="sr-only">. {saude.motivo}</span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="start"
            sideOffset={6}
            className="tf-glass border-line text-fg z-50 max-w-64 rounded-sm border px-2.5 py-1.5 text-[length:var(--text-caption-size)] shadow-[var(--shadow-popover)]"
          >
            <strong className="font-medium">{rotulo}.</strong> {saude.motivo}
            <Tooltip.Arrow className="fill-[var(--surface-card)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
