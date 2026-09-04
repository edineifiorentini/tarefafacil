"use client";

import { IconX } from "@tabler/icons-react";

import type { ListFilters } from "@/lib/task/list-view";

/**
 * Os filtros ligados, um a um, cada um com o seu X.
 *
 * Existe porque a tela antiga escondia o recorte: com cinco seletores
 * mostrando "Todas", "Todos os setores", "Todos os responsáveis", ninguém
 * conseguia dizer de relance o que estava filtrado — e a lista curta
 * parecia um workspace vazio, não um filtro esquecido.
 *
 * **Cada chip remove só o seu filtro.** É a diferença entre corrigir o
 * recorte e recomeçar do zero, e é o que faz "Limpar" ser uma escolha em
 * vez da única saída.
 */

export type ChipDeFiltro = {
  chave: string;
  rotulo: string;
  remover: () => void;
};

/**
 * Monta os chips a partir dos filtros, resolvendo id em nome.
 *
 * Fica aqui e não no componente-pai porque é tradução de dado para texto —
 * e porque a mesma lógica serviria a qualquer outra tela que ganhe esta
 * barra.
 */
export function chipsDosFiltros(
  f: ListFilters,
  nomes: {
    setor: (id: string) => string;
    cliente: (id: string) => string;
    responsavel: (id: string) => string;
    prioridade: (v: string) => string;
    status: (v: string) => string;
  },
  alterar: (mudanca: Partial<ListFilters>) => void
): ChipDeFiltro[] {
  const chips: ChipDeFiltro[] = [];

  if (f.status !== "todas") {
    chips.push({
      chave: "status",
      rotulo: `Status: ${nomes.status(f.status)}`,
      remover: () => alterar({ status: "todas" }),
    });
  }

  for (const id of f.sectorIds) {
    chips.push({
      chave: `setor:${id}`,
      rotulo: `Setor: ${nomes.setor(id)}`,
      remover: () =>
        alterar({ sectorIds: f.sectorIds.filter((x) => x !== id) }),
    });
  }

  for (const p of f.priorities) {
    chips.push({
      chave: `prioridade:${p}`,
      rotulo: `Prioridade: ${nomes.prioridade(p)}`,
      remover: () =>
        alterar({ priorities: f.priorities.filter((x) => x !== p) }),
    });
  }

  if (f.clientId) {
    chips.push({
      chave: "cliente",
      rotulo: `Cliente: ${nomes.cliente(f.clientId)}`,
      remover: () => alterar({ clientId: null }),
    });
  }

  if (f.assigneeId) {
    chips.push({
      chave: "responsavel",
      rotulo: `Responsável: ${nomes.responsavel(f.assigneeId)}`,
      remover: () => alterar({ assigneeId: null }),
    });
  }

  if (f.dueWithinDays) {
    chips.push({
      chave: "prazo",
      rotulo: `Prazo: próximos ${f.dueWithinDays} dias`,
      remover: () => alterar({ dueWithinDays: null }),
    });
  }

  if (f.temPrazo) {
    chips.push({
      chave: "temprazo",
      rotulo: f.temPrazo === "com" ? "Com prazo" : "Sem prazo",
      remover: () => alterar({ temPrazo: null }),
    });
  }

  return chips;
}

export function ActiveFilterChips({
  chips,
  onLimpar,
}: {
  chips: ChipDeFiltro[];
  onLimpar: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.chave}
          className="border-line bg-card text-fg-secondary inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-2.5 text-[length:var(--text-caption-size)]"
        >
          {c.rotulo}
          <button
            type="button"
            onClick={c.remover}
            aria-label={`Remover filtro ${c.rotulo}`}
            className="text-fg-muted hover:text-fg hover:bg-hover inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]"
          >
            <IconX size={12} stroke={2.5} aria-hidden />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onLimpar}
        className="text-fg-link rounded-xs px-1 text-[length:var(--text-caption-size)] outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        Limpar
      </button>
    </div>
  );
}
