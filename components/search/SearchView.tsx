"use client";

import { IconSearch, IconSearchOff } from "@tabler/icons-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { TaskRows } from "@/components/task/TaskRows";
import { useSearch } from "@/lib/queries/useSearch";
import { useSearchFilters } from "@/lib/search/filters";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { FilterBar } from "./FilterBar";
import { SearchInput } from "./SearchInput";

export function SearchView() {
  const workspace = useWorkspace();
  const {
    filters,
    hasAny,
    setQ,
    toggleValue,
    setStatus,
    setService,
    setDueRange,
    clearAll,
  } = useSearchFilters();
  const {
    data: results,
    isFetching,
    isPending,
  } = useSearch(workspace.id, filters);

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
          onService={setService}
        />
        {hasAny ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-fg-link text-[length:var(--text-small-size)]"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      {!hasAny ? (
        <EmptyState
          icon={IconSearch}
          title="Encontre qualquer tarefa"
          description="Busque por título, descrição ou insight — ou combine os filtros acima"
        />
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
            className="text-fg-muted text-[length:var(--text-caption-size)]"
          >
            {count === 1 ? "1 resultado" : `${count} resultados`}
          </span>
          <TaskRows
            tasks={results ?? []}
            empty={
              <EmptyState
                icon={IconSearchOff}
                title="Nada encontrado"
                description="Ajuste a busca ou os filtros"
              />
            }
          />
        </div>
      )}
    </div>
  );
}
