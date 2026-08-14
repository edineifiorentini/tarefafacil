"use client";

import {
  IconDotsVertical,
  IconFileText,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useMemo, useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { computeContractStats, isExpiringSoon } from "@/lib/contracts/stats";
import { formatCentsBRL } from "@/lib/finance/money";
import { useClients } from "@/lib/queries/useClients";
import {
  useContracts,
  useDeleteContract,
  useSetContractStatus,
} from "@/lib/queries/useContracts";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Contract, ContractStatus } from "@/types/database";

import { ContractForm } from "./ContractForm";

const STATUS_LABEL: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  assinado: "Assinado",
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};
const STATUS_TONE: Record<ContractStatus, string> = {
  rascunho: "var(--color-fg-muted)",
  enviado: "var(--tone-blue)",
  assinado: "var(--tone-violet)",
  ativo: "var(--brand-600)",
  encerrado: "var(--color-fg-muted)",
  cancelado: "var(--color-overdue)",
};
// Transições sugeridas a partir de cada estado (spec 9.1: rascunho -> ... -> ativo).
const NEXT_STATUS: Partial<Record<ContractStatus, ContractStatus>> = {
  rascunho: "enviado",
  enviado: "assinado",
  assinado: "ativo",
};
const NEXT_LABEL: Partial<Record<ContractStatus, string>> = {
  rascunho: "Marcar como enviado",
  enviado: "Marcar como assinado",
  assinado: "Ativar contrato",
};

export function ContractsView() {
  const workspace = useWorkspace();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const { data: contracts = [], isLoading } = useContracts(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const setStatus = useSetContractStatus(workspace.id);
  const deleteContract = useDeleteContract(workspace.id);
  const { openPanel, closePanel } = useShell();

  const [statusFilter, setStatusFilter] = useState<"__all__" | ContractStatus>("__all__");
  const [clientFilter, setClientFilter] = useState("__all__");

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const stats = useMemo(() => computeContractStats(contracts), [contracts]);
  const visible = contracts
    .filter((c) => statusFilter === "__all__" || c.status === statusFilter)
    .filter((c) => clientFilter === "__all__" || c.client_id === clientFilter);

  function openForm(contract?: Contract) {
    openPanel({
      title: contract ? "Editar contrato" : "Novo contrato",
      node: <ContractForm mode={contract ? "edit" : "create"} contract={contract} onDone={closePanel} />,
    });
  }

  if (!canManage) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8">
        <EmptyState
          icon={IconFileText}
          title="Acesso restrito"
          description="Contratos são visíveis apenas para o dono e administradores do workspace"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">Contratos</h1>
        <Button
          variant="primary"
          size="sm"
          leadingIcon={IconPlus}
          className="ml-auto"
          onClick={() => openForm()}
        >
          Novo contrato
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Rascunhos" value={stats.rascunhos} icon={IconFileText} tone="var(--color-fg-muted)" />
        <StatCard label="Enviados" value={stats.enviados} icon={IconFileText} tone="var(--tone-blue)" />
        <StatCard
          label="Assinados / ativos"
          value={stats.assinadosAtivos}
          icon={IconFileText}
          tone="var(--brand-600)"
        />
        <StatCard
          label="Valor mensal contratado"
          value={formatCentsBRL(stats.valorMensalCents)}
          icon={IconFileText}
          tone="var(--color-fg)"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <Select
            options={[{ value: "__all__", label: "Todas as situações" }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            aria-label="Filtrar por situação"
          />
        </div>
        <div className="w-44">
          <Select
            options={[{ value: "__all__", label: "Todos os clientes" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            value={clientFilter}
            onValueChange={setClientFilter}
            aria-label="Filtrar por cliente"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={IconFileText}
          title="Nenhum contrato ainda"
          description="Crie o primeiro contrato para formalizar um acordo com um cliente"
          action={
            <Button variant="primary" leadingIcon={IconPlus} onClick={() => openForm()}>
              Novo contrato
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-sunken text-[length:var(--text-caption-size)] uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-2 font-medium">Contrato</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Vigência</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const nextStatus = NEXT_STATUS[c.status];
                const expiring = isExpiringSoon(c, 30);
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-line last:border-0 transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken"
                    onClick={() => openForm(c)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-fg">{c.title}</span>
                      {c.number ? (
                        <span className="block text-[length:var(--text-caption-size)] text-fg-muted">
                          {c.number}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[length:var(--text-small-size)] text-fg-secondary">
                      {clientNameById.get(c.client_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[length:var(--text-small-size)] text-fg-secondary">
                      {c.starts_on ? c.starts_on.split("-").reverse().join("/") : "—"}
                      {c.ends_on ? ` — ${c.ends_on.split("-").reverse().join("/")}` : ""}
                      {expiring ? (
                        <span className="ml-2 text-[length:var(--text-caption-size)] font-medium text-overdue">
                          vence em breve
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium"
                        style={{
                          color: STATUS_TONE[c.status],
                          background: `color-mix(in srgb, ${STATUS_TONE[c.status]} 14%, transparent)`,
                        }}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tnum text-[length:var(--text-small-size)] font-medium text-fg">
                      {c.amount_cents ? formatCentsBRL(c.amount_cents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            aria-label={`Ações de ${c.title}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-sunken hover:text-fg"
                          >
                            <IconDotsVertical size={16} stroke={1.5} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={4}
                            className="z-50 min-w-48 overflow-hidden rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)] data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
                          >
                            {nextStatus ? (
                              <DropdownMenu.Item
                                onSelect={() => setStatus.mutate({ id: c.id, status: nextStatus })}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                              >
                                {NEXT_LABEL[c.status]}
                              </DropdownMenu.Item>
                            ) : null}
                            {c.status !== "encerrado" && c.status !== "cancelado" ? (
                              <DropdownMenu.Item
                                onSelect={() => setStatus.mutate({ id: c.id, status: "encerrado" })}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                              >
                                Encerrar
                              </DropdownMenu.Item>
                            ) : null}
                            {c.status !== "cancelado" ? (
                              <DropdownMenu.Item
                                onSelect={() => setStatus.mutate({ id: c.id, status: "cancelado" })}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                              >
                                Cancelar
                              </DropdownMenu.Item>
                            ) : null}
                            {/* Excluir só é permitido em rascunho (spec 9.1) — os
                                demais estados preservam histórico via cancelar/encerrar. */}
                            {c.status === "rascunho" ? (
                              <DropdownMenu.Item
                                onSelect={() => deleteContract.mutate(c.id)}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-overdue outline-none data-[highlighted]:bg-sunken"
                              >
                                <IconTrash size={14} stroke={1.5} />
                                Excluir rascunho
                              </DropdownMenu.Item>
                            ) : null}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
