"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type SearchFilters = {
  q: string;
  sectors: string[];
  tags: string[];
  priorities: string[]; // sem_prioridade | baixa | media | alta | urgente
  status: string | null; // aberta | concluida | cancelada | atrasada
  dueFrom: string | null; // YYYY-MM-DD
  dueTo: string | null;
  service: string; // tipo de demanda (texto livre)
};

export const EMPTY_FILTERS: SearchFilters = {
  q: "",
  sectors: [],
  tags: [],
  priorities: [],
  status: null,
  dueFrom: null,
  dueTo: null,
  service: "",
};

type ArrayKey = "sectors" | "tags" | "priorities";

function parse(sp: URLSearchParams): SearchFilters {
  const csv = (k: string) =>
    sp
      .get(k)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  return {
    q: sp.get("q") ?? "",
    sectors: csv("setor"),
    tags: csv("tag"),
    priorities: csv("prioridade"),
    status: sp.get("status"),
    dueFrom: sp.get("de"),
    dueTo: sp.get("ate"),
    service: sp.get("servico") ?? "",
  };
}

function toQueryString(f: SearchFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.sectors.length) p.set("setor", f.sectors.join(","));
  if (f.tags.length) p.set("tag", f.tags.join(","));
  if (f.priorities.length) p.set("prioridade", f.priorities.join(","));
  if (f.status) p.set("status", f.status);
  if (f.dueFrom) p.set("de", f.dueFrom);
  if (f.dueTo) p.set("ate", f.dueTo);
  if (f.service) p.set("servico", f.service);
  return p.toString();
}

export function hasAnyFilter(f: SearchFilters): boolean {
  return (
    f.q.trim() !== "" ||
    f.sectors.length > 0 ||
    f.tags.length > 0 ||
    f.priorities.length > 0 ||
    !!f.status ||
    !!f.dueFrom ||
    !!f.dueTo ||
    f.service.trim() !== ""
  );
}

// Estado dos filtros espelhado na URL (compartilhável e restaurável).
export function useSearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filters = useMemo(
    () => parse(new URLSearchParams(sp.toString())),
    [sp]
  );

  const apply = useCallback(
    (next: SearchFilters) => {
      const qs = toQueryString(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const setQ = useCallback(
    (q: string) => apply({ ...filters, q }),
    [apply, filters]
  );

  const toggleValue = useCallback(
    (key: ArrayKey, value: string) => {
      const current = filters[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      apply({ ...filters, [key]: next });
    },
    [apply, filters]
  );

  const setStatus = useCallback(
    (status: string | null) => apply({ ...filters, status }),
    [apply, filters]
  );

  const setService = useCallback(
    (service: string) => apply({ ...filters, service }),
    [apply, filters]
  );

  const setDueRange = useCallback(
    (dueFrom: string | null, dueTo: string | null) =>
      apply({ ...filters, dueFrom: dueFrom || null, dueTo: dueTo || null }),
    [apply, filters]
  );

  const clearAll = useCallback(() => apply(EMPTY_FILTERS), [apply]);

  return {
    filters,
    hasAny: hasAnyFilter(filters),
    setQ,
    toggleValue,
    setStatus,
    setService,
    setDueRange,
    clearAll,
  };
}
