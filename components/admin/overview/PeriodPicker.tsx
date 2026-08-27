"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { Janela } from "@/lib/admin/metrics";

const OPCOES: { valor: Janela; label: string }[] = [
  { valor: 7, label: "7 dias" },
  { valor: 30, label: "30 dias" },
  { valor: 90, label: "90 dias" },
];

/**
 * Seletor de período da visão geral (especificação 8.1).
 *
 * O valor vai para a URL, não para estado local: o painel é feito para ser
 * mandado por link ("olha os 90 dias"), e recarregar a página não pode
 * devolver outro recorte. É também o que permite a página continuar sendo
 * Server Component — quem recalcula é o servidor.
 *
 * É um radiogroup, não um grupo de botões: as opções são exclusivas, e as
 * setas do teclado precisam andar entre elas.
 */
export function PeriodPicker({ atual }: { atual: Janela }) {
  const router = useRouter();
  const params = useSearchParams();

  function escolher(valor: Janela) {
    const novo = new URLSearchParams(params.toString());
    novo.set("dias", String(valor));
    router.push(`/admin?${novo.toString()}`);
  }

  function onKeyDown(e: React.KeyboardEvent, indice: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const passo = e.key === "ArrowRight" ? 1 : -1;
    const proximo = (indice + passo + OPCOES.length) % OPCOES.length;
    escolher(OPCOES[proximo].valor);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Período"
      className="border-line bg-card flex items-center gap-1 rounded-md border p-1"
    >
      {OPCOES.map((o, i) => {
        const selecionado = o.valor === atual;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={selecionado}
            // Só o selecionado é alcançável por Tab: dentro do grupo, quem
            // anda são as setas.
            tabIndex={selecionado ? 0 : -1}
            onClick={() => escolher(o.valor)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-sm px-3 py-1.5 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
              selecionado
                ? "bg-selected text-fg-link font-medium"
                : "text-fg-secondary hover:bg-hover"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
