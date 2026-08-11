"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { TaskRows } from "@/components/task/TaskRows";
import { useSearch } from "@/lib/queries/useSearch";
import { useSearchFilters } from "@/lib/search/filters";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { FilterBar } from "./FilterBar";
import { SearchInput } from "./SearchInput";

export function SearchView() {
  const workspace = useWorkspace();
  const { filters, hasAny, setQ, toggleValue, setStatus, setDueRange, clearAll } =
    useSearchFilters();
  const { data: results, isFetching, isPending } = useSearch(
    workspace.id,
    filters
  );

  const count = results?.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8">
      <SearchInput value={filters.q} onChange={setQ} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          filters={filters}
          onToggle={toggleValue}
          onStatus={setStatus}
          onDueRange={setDueRange}
        />
        {hasAny ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-[length:var(--text-small-size)] text-fg-link"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      {!hasAny ? (
        <p className="py-12 text-center text-fg-secondary">
          Busque por título, descrição ou insight — ou combine os filtros acima
        </p>
      ) : isPending || (isFetching && !results) ? (
        <div className="flex flex-col gap-2">
          <Skeleton variant="block" className="h-12" />
          <Skeleton variant="block" className="h-12" />
          <Skeleton variant="block" className="h-12" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span
            aria-live="polite"
            className="text-[length:var(--text-caption-size)] text-fg-muted"
          >
            {count === 1 ? "1 resultado" : `${count} resultados`}
          </span>
          <TaskRows
            tasks={results ?? []}
            empty={
              <p className="py-12 text-center text-fg-secondary">
                Nada encontrado. Ajuste a busca ou os filtros
              </p>
            }
          />
        </div>
      )}
    </div>
  );
}
