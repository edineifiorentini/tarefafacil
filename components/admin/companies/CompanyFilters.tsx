"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { IconSearch, IconX } from "@tabler/icons-react";

import {
  chipsDeFiltro,
  type FiltrosDeEmpresa,
} from "@/lib/admin/company-filters";
import { STATUS_META, type StatusEmpresa } from "@/lib/admin/status";

/**
 * Filtros da listagem de empresas (especificação 9.4).
 *
 * Tudo na URL: é o que permite os alertas da visão geral abrirem esta tela
 * já filtrada, e o que faz um recorte ser mandável por link. A página segue
 * sendo Server Component — quem filtra é o servidor.
 *
 * Filtro ativo vira chip removível, e existe "limpar tudo": um recorte que
 * não dá para desfazer com um clique faz a pessoa achar que a lista está
 * vazia.
 */

const STATUS: StatusEmpresa[] = [
  "ativa",
  "teste",
  "pendente",
  "inadimplente",
  "suspensa",
  "inativa",
  "cancelada",
];

export function CompanyFilters({
  filtros,
  total,
  exibidas,
}: {
  filtros: FiltrosDeEmpresa;
  total: number;
  exibidas: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function aplicar(chave: string, valor: string | null) {
    const novo = new URLSearchParams(params.toString());
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    // `novo=1` abre o cadastro; ele não pode sobreviver a uma troca de
    // filtro, senão o diálogo reabre a cada clique.
    novo.delete("novo");
    const qs = novo.toString();
    router.push(qs ? `/admin/empresas?${qs}` : "/admin/empresas");
  }

  const chips = chipsDeFiltro(filtros, (s) => STATUS_META[s].label);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const campo = new FormData(e.currentTarget).get("q");
            aplicar("q", String(campo ?? "").trim() || null);
          }}
          className="min-w-0 flex-1"
        >
          <label className="sr-only" htmlFor="filtro-empresa">
            Buscar empresa, responsável ou plano
          </label>
          <div className="border-line bg-card focus-within:border-line-strong flex items-center gap-2 rounded-md border px-3 py-2">
            <IconSearch
              size={18}
              stroke={1.75}
              className="text-fg-muted shrink-0"
              aria-hidden
            />
            <input
              id="filtro-empresa"
              name="q"
              defaultValue={filtros.q ?? ""}
              placeholder="Buscar empresa, responsável ou plano"
              className="text-fg placeholder:text-fg-muted min-w-0 flex-1 bg-transparent text-[length:var(--text-small-size)] outline-none"
            />
          </div>
        </form>

        <label className="sr-only" htmlFor="filtro-status">
          Situação
        </label>
        <select
          id="filtro-status"
          value={filtros.status ?? ""}
          onChange={(e) => aplicar("status", e.target.value || null)}
          className="border-line bg-card text-fg rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <option value="">Qualquer situação</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-fg-muted text-[length:var(--text-caption-size)]">
          {exibidas === total
            ? `${total} empresa${total === 1 ? "" : "s"}`
            : `${exibidas} de ${total}`}
        </span>

        {chips.map((c) => (
          <button
            key={c.chave}
            type="button"
            onClick={() => aplicar(c.chave, null)}
            className="bg-selected text-fg-link hover:bg-hover flex items-center gap-1 rounded-xs px-2 py-1 text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            {c.label}
            <IconX size={13} stroke={2} aria-hidden />
            <span className="sr-only">Remover filtro</span>
          </button>
        ))}

        {chips.length > 0 ? (
          <button
            type="button"
            onClick={() => router.push("/admin/empresas")}
            className="text-fg-muted hover:text-fg rounded-sm text-[length:var(--text-caption-size)] underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            Limpar tudo
          </button>
        ) : null}
      </div>
    </div>
  );
}
