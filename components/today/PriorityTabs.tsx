"use client";

import type { Bucket } from "@/lib/today/summary";

/**
 * Controle segmentado das prioridades do dia.
 *
 * É um `radiogroup` e não uma fila de botões: as opções são exclusivas, e
 * leitor de tela precisa anunciar "1 de 4" em vez de quatro botões soltos.
 * As setas do teclado andam entre as opções, que é o comportamento que quem
 * usa teclado espera de um segmentado.
 *
 * A contagem vive dentro do rótulo de propósito. Sem ela a pessoa precisa
 * clicar em cada aba para descobrir onde está o problema do dia — e o ponto
 * da tela é responder isso sem clique nenhum.
 */
export type TabDef = { id: Bucket; label: string; count: number };

export function PriorityTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: Bucket;
  onChange: (id: Bucket) => void;
}) {
  function mover(delta: number) {
    const i = tabs.findIndex((t) => t.id === active);
    // Circular: da última volta para a primeira, como num rádio nativo.
    const proximo = tabs[(i + delta + tabs.length) % tabs.length];
    if (proximo) onChange(proximo.id);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Filtrar prioridades"
      onKeyDown={(e) => {
        const passo =
          e.key === "ArrowRight" || e.key === "ArrowDown"
            ? 1
            : e.key === "ArrowLeft" || e.key === "ArrowUp"
              ? -1
              : 0;
        if (!passo) return;
        e.preventDefault();
        mover(passo);
      }}
      className="border-line bg-sunken flex w-fit max-w-full gap-1 overflow-x-auto rounded-md border p-1"
    >
      {tabs.map((t) => {
        const ativo = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            // Só a opção ativa entra na ordem de tabulação: o Tab passa pelo
            // grupo inteiro de uma vez e as setas navegam dentro dele.
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
              ativo
                ? "bg-card text-fg font-medium shadow-[var(--shadow-peek)]"
                : "text-fg-secondary hover:text-fg"
            }`}
          >
            {t.label}
            <span
              className={`tnum text-[length:var(--text-caption-size)] ${
                ativo ? "text-fg-secondary" : "text-fg-muted"
              }`}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
