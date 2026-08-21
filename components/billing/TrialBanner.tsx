"use client";

import { IconSparkles } from "@tabler/icons-react";
import Link from "next/link";

import { useWorkspace } from "@/lib/queries/useWorkspace";

/** Dias inteiros que faltam. Zero significa "acaba hoje", não "acabou". */
export function daysLeft(endsAt: string, now: Date): number {
  const fim = new Date(endsAt).getTime();
  const dias = Math.ceil((fim - now.getTime()) / 86_400_000);
  // `Math.ceil` de uma fração negativa devolve -0, que imprimiria "-0" se
  // alguém mostrar o número cru.
  return dias === 0 ? 0 : dias;
}

export function trialLabel(dias: number): string {
  if (dias > 1) return `Teste grátis — faltam ${dias} dias`;
  if (dias === 1) return "Teste grátis — último dia";
  return "Seu teste terminou";
}

/**
 * Faixa do período de teste.
 *
 * Some assim que a empresa escolhe um plano: quem já decidiu não precisa
 * ser lembrado todo dia. Também some para quem nunca esteve em teste — a
 * maioria dos workspaces, que foram cadastrados por você no painel.
 *
 * A faixa não bloqueia nada, nem no oitavo dia: enquanto a cobrança não
 * existe, cortar seria trancar alguém para fora por uma fatura que o
 * sistema não sabe emitir.
 */
export function TrialBanner() {
  const workspace = useWorkspace();
  if (!workspace.trial || !workspace.trial_ends_at) return null;
  if (workspace.plan_id) return null;

  // Server Component não renderiza isto; aqui o relógio é do navegador e a
  // conta é por dia, então uma leitura na montagem basta.
  const dias = daysLeft(workspace.trial_ends_at, new Date());

  return (
    <div className="border-line bg-sunken flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
      <span className="text-fg flex items-center gap-2 text-[length:var(--text-small-size)]">
        <IconSparkles
          size={16}
          stroke={1.5}
          className="text-fg-link shrink-0"
          aria-hidden
        />
        {trialLabel(dias)}
      </span>
      {/* Link, não botão: é navegação, e o Button do projeto não tem
          `asChild` para emprestar o estilo a uma âncora. */}
      <Link
        href="/planos"
        className="border-line bg-card text-fg hover:bg-hover inline-flex h-8 shrink-0 items-center rounded-sm border px-3 text-[length:var(--text-small-size)] font-medium transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        Escolher plano
      </Link>
    </div>
  );
}
