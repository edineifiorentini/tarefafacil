"use client";

import { IconPlus, IconSearch, IconUsers } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useClients } from "@/lib/queries/useClients";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { maskDocument } from "@/lib/validation/document";
import type { Client, ClientStatus } from "@/types/database";

import { ClientDetail } from "./ClientDetail";
import { ClientForm } from "./ClientForm";
import { ClientStatusPill } from "./ClientStatusPill";

type Filter = "todos" | ClientStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "prospecto", label: "Prospectos" },
  { value: "pausado", label: "Pausados" },
  { value: "encerrado", label: "Encerrados" },
];

export function ClientsView() {
  const workspace = useWorkspace();
  const { data: clients = [], isLoading } = useClients(workspace.id);
  const { openPanel, closePanel } = useShell();
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const acc = { total: clients.length, ativo: 0, prospecto: 0, pausado: 0 };
    for (const c of clients) {
      if (c.status === "ativo") acc.ativo += 1;
      else if (c.status === "prospecto") acc.prospecto += 1;
      else if (c.status === "pausado") acc.pausado += 1;
    }
    return acc;
  }, [clients]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter !== "todos" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.fantasy_name?.toLowerCase().includes(q) ?? false) ||
        (c.document?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clients, filter, query]);

  function openNew() {
    openPanel({
      title: "Novo cliente",
      node: <ClientForm mode="create" onDone={closePanel} />,
    });
  }

  function openClient(client: Client) {
    openPanel({
      title: "Cliente",
      node: <ClientDetail clientId={client.id} />,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicator label="Total" value={counts.total} />
        <Indicator label="Ativos" value={counts.ativo} />
        <Indicator label="Prospectos" value={counts.prospecto} />
        <Indicator label="Pausados" value={counts.pausado} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <IconSearch
            aria-hidden
            size={18}
            stroke={1.5}
            className="text-fg-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="search"
            aria-label="Buscar cliente"
            placeholder="Buscar cliente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-line bg-page text-fg placeholder:text-fg-muted focus-visible:border-line-strong w-full rounded-full border py-2 pr-4 pl-10 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)]"
          />
        </div>

        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label="Situação"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] ${
                filter === f.value
                  ? "bg-selected text-fg font-medium"
                  : "text-fg-secondary hover:bg-hover hover:text-fg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          leadingIcon={IconPlus}
          className="ml-auto"
          onClick={openNew}
        >
          Novo cliente
        </Button>
      </div>

      {isLoading ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          title="Nenhum cliente ainda"
          description="Cadastre o primeiro cliente para vincular demandas, contratos e cobranças"
          action={
            <Button variant="primary" leadingIcon={IconPlus} onClick={openNew}>
              Novo cliente
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <p className="text-fg-secondary py-8 text-center">
          Nenhum cliente encontrado para esse filtro
        </p>
      ) : (
        <div className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-line bg-sunken text-fg-muted border-b text-[length:var(--text-caption-size)] tracking-wide uppercase">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">
                  Documento
                </th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">
                  Contato
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onClick={() => openClient(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openClient(c);
                    }
                  }}
                  className="border-line hover:bg-hover focus-visible:bg-sunken cursor-pointer border-b transition-colors [transition-duration:var(--dur-fast)] last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  <td className="px-4 py-3">
                    <span className="text-fg font-medium">{c.name}</span>
                    {c.fantasy_name ? (
                      <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                        {c.fantasy_name}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusPill status={c.status as ClientStatus} />
                  </td>
                  <td className="text-fg-secondary hidden px-4 py-3 text-[length:var(--text-small-size)] sm:table-cell">
                    {c.document
                      ? maskDocument(c.document, c.type as "pf" | "pj")
                      : "—"}
                  </td>
                  <td className="text-fg-secondary hidden px-4 py-3 text-[length:var(--text-small-size)] md:table-cell">
                    {c.email ?? c.phone ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Indicator({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-line bg-card flex flex-col gap-1 rounded-md border p-4">
      <span className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
        {label}
      </span>
      <span className="tnum text-fg text-[length:var(--text-h2-size)] font-semibold">
        {value}
      </span>
    </div>
  );
}
