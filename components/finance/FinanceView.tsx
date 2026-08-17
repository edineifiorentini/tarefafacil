"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconMoneybag,
  IconPigMoney,
  IconPlus,
  IconReceipt2,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import {
  buildCashFlowSeries,
  periodBalance,
  type CashFlowMode,
} from "@/lib/finance/cashflow";
import { formatCentsBRL } from "@/lib/finance/money";
import { currentMonthISO, monthLabel, shiftMonth } from "@/lib/finance/month";
import {
  computeFinanceStats,
  entriesForMonth,
  isOverdue,
} from "@/lib/finance/stats";
import { useClients } from "@/lib/queries/useClients";
import {
  useConfirmFinanceEntry,
  useDeleteFinanceEntry,
  useFinanceEntries,
} from "@/lib/queries/useFinance";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type {
  FinanceEntry,
  FinanceKind,
  FinanceStatus,
} from "@/types/database";

import { CashFlowChart } from "./CashFlowChart";
import { FinanceEntryForm } from "./FinanceEntryForm";
import { GoalGauge } from "./GoalGauge";
import { InvoiceSummary } from "./InvoiceSummary";

const HIDE_KEY = "tf-finance-hide-values";
const STATUS_LABEL: Record<FinanceStatus, string> = {
  previsto: "Prevista",
  confirmado: "Confirmada",
  cancelado: "Cancelada",
};

/** Filtro com a largura do próprio rótulo — ver `ListView`. */
const FILTER_W = "max-w-60";

export function FinanceView() {
  const workspace = useWorkspace();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const { data: entries = [], isLoading } = useFinanceEntries(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const confirmEntry = useConfirmFinanceEntry(workspace.id);
  const deleteEntry = useDeleteFinanceEntry(workspace.id);
  const { openPanel, closePanel } = useShell();

  const [month, setMonth] = useState(currentMonthISO);
  const [hide, setHide] = useState(false);
  const [kindFilter, setKindFilter] = useState<"__all__" | FinanceKind>(
    "__all__"
  );
  const [statusFilter, setStatusFilter] = useState<"__all__" | FinanceStatus>(
    "__all__"
  );
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [cashFlowMode, setCashFlowMode] = useState<CashFlowMode>("realizado");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIDE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "1") setHide(true);
    } catch {
      // localStorage indisponível — segue sem persistir a preferência
    }
  }, []);

  function toggleHide() {
    setHide((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(HIDE_KEY, next ? "1" : "0");
      } catch {
        // idem
      }
      return next;
    });
  }

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const stats = useMemo(
    () => computeFinanceStats(entries, month),
    [entries, month]
  );
  const cashFlow = useMemo(
    () => buildCashFlowSeries(entries, month, months, cashFlowMode),
    [entries, month, months, cashFlowMode]
  );
  const monthEntries = useMemo(
    () => entriesForMonth(entries, month),
    [entries, month]
  );
  const visible = useMemo(() => {
    return monthEntries
      .filter((e) => kindFilter === "__all__" || e.kind === kindFilter)
      .filter((e) => statusFilter === "__all__" || e.status === statusFilter)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [monthEntries, kindFilter, statusFilter]);

  function mask(text: string) {
    return hide ? "••••••" : text;
  }

  function openForm(entry?: FinanceEntry) {
    openPanel({
      title: entry ? "Editar lançamento" : "Novo lançamento",
      node: (
        <FinanceEntryForm
          mode={entry ? "edit" : "create"}
          entry={entry}
          onDone={closePanel}
        />
      ),
    });
  }

  if (!canManage) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8">
        <EmptyState
          icon={IconMoneybag}
          title="Acesso restrito"
          description="O financeiro é visível apenas para o dono e administradores do workspace"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      {/* Título e subtítulo vivem na barra superior — aqui ficam só as ações. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-8 w-8 items-center justify-center rounded-sm"
          >
            <IconChevronLeft size={18} stroke={1.5} />
          </button>
          <span className="text-fg w-40 text-center text-[length:var(--text-small-size)] font-medium">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-8 w-8 items-center justify-center rounded-sm"
          >
            <IconChevronRight size={18} stroke={1.5} />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(currentMonthISO())}
          >
            Hoje
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          leadingIcon={hide ? IconEyeOff : IconEye}
          onClick={toggleHide}
        >
          {hide ? "Mostrar valores" : "Ocultar valores"}
        </Button>

        <Button
          variant="primary"
          size="sm"
          leadingIcon={IconPlus}
          onClick={() => openForm()}
        >
          Novo lançamento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Recebido"
          value={mask(formatCentsBRL(stats.recebido))}
          icon={IconTrendingUp}
          tone="var(--color-fg)"
        />
        <StatCard
          label="Despesas"
          value={mask(formatCentsBRL(stats.despesas))}
          icon={IconTrendingDown}
          tone="var(--color-fg)"
        />
        <StatCard
          label="Lucro do mês"
          value={mask(formatCentsBRL(stats.lucro))}
          icon={IconPigMoney}
          tone={stats.lucro < 0 ? "var(--color-overdue)" : "var(--color-fg)"}
        />
        <StatCard
          label="A receber"
          value={mask(formatCentsBRL(stats.aReceber))}
          icon={IconReceipt2}
          tone="var(--tone-blue)"
        />
        <StatCard
          label="A pagar"
          value={mask(formatCentsBRL(stats.aPagar))}
          icon={IconReceipt2}
          tone="var(--tone-amber)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border-line bg-card flex flex-col gap-3 rounded-md border p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
              Fluxo de caixa
            </h2>
            <div className="flex items-center gap-2">
              <div className={FILTER_W}>
                <Select
                  options={[
                    { value: "realizado", label: "Realizado" },
                    { value: "previsto", label: "Previsto" },
                  ]}
                  value={cashFlowMode}
                  onValueChange={(v) => setCashFlowMode(v as CashFlowMode)}
                  aria-label="Modo do fluxo de caixa"
                />
              </div>
              <div className={FILTER_W}>
                <Select
                  options={[
                    { value: "3", label: "3 meses" },
                    { value: "6", label: "6 meses" },
                    { value: "12", label: "12 meses" },
                  ]}
                  value={String(months)}
                  onValueChange={(v) => setMonths(Number(v) as 3 | 6 | 12)}
                  aria-label="Período do fluxo de caixa"
                />
              </div>
            </div>
          </div>
          <CashFlowChart points={cashFlow} />
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Saldo do período:{" "}
            <span
              className={`tnum font-medium ${periodBalance(cashFlow) < 0 ? "text-overdue" : "text-fg"}`}
            >
              {mask(formatCentsBRL(periodBalance(cashFlow)))}
            </span>
          </p>
        </div>

        <GoalGauge month={month} received={stats.recebido} />
      </div>

      <InvoiceSummary entries={monthEntries} onOpen={openForm} />

      <div className="flex flex-wrap items-center gap-2">
        <div className={FILTER_W}>
          <Select
            options={[
              { value: "__all__", label: "Todos os tipos" },
              { value: "entrada", label: "Entradas" },
              { value: "saida", label: "Saídas" },
            ]}
            value={kindFilter}
            onValueChange={(v) => setKindFilter(v as typeof kindFilter)}
            aria-label="Filtrar por tipo"
          />
        </div>
        <div className={FILTER_W}>
          <Select
            options={[
              { value: "__all__", label: "Todas as situações" },
              { value: "previsto", label: "Previstas" },
              { value: "confirmado", label: "Confirmadas" },
              { value: "cancelado", label: "Canceladas" },
            ]}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            aria-label="Filtrar por situação"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={IconMoneybag}
          title="Nenhum lançamento neste mês"
          description="Registre entradas e saídas para acompanhar o fechamento"
          action={
            <Button
              variant="primary"
              leadingIcon={IconPlus}
              onClick={() => openForm()}
            >
              Novo lançamento
            </Button>
          }
        />
      ) : (
        <div className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-line bg-sunken text-fg-muted border-b text-[length:var(--text-caption-size)] tracking-wide uppercase">
                <th className="px-4 py-2 font-medium">Descrição</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Vencimento</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => {
                const overdue = isOverdue(e);
                return (
                  <tr
                    key={e.id}
                    className="border-line hover:bg-hover cursor-pointer border-b transition-colors [transition-duration:var(--dur-fast)] last:border-0"
                    onClick={() => openForm(e)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-fg font-medium">
                        {e.description}
                      </span>
                      {e.category ? (
                        <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                          {e.category}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {e.client_id
                        ? (clientNameById.get(e.client_id) ?? "—")
                        : "—"}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {e.due_date.split("-").reverse().join("/")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[length:var(--text-small-size)] ${
                          overdue
                            ? "text-overdue font-medium"
                            : "text-fg-secondary"
                        }`}
                      >
                        {overdue ? "Vencida" : STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    <td
                      className={`tnum px-4 py-3 text-right text-[length:var(--text-small-size)] font-medium ${
                        e.kind === "saida" ? "text-overdue" : "text-fg"
                      }`}
                    >
                      {e.kind === "saida" ? "−" : "+"}
                      {mask(formatCentsBRL(e.amount_cents))}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {e.status === "previsto" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            confirmEntry.mutate({
                              id: e.id,
                              confirmedOn: new Date()
                                .toISOString()
                                .slice(0, 10),
                            })
                          }
                        >
                          {e.kind === "entrada"
                            ? "Marcar recebido"
                            : "Marcar pago"}
                        </Button>
                      ) : e.status === "confirmado" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            confirmEntry.mutate({ id: e.id, confirmedOn: null })
                          }
                        >
                          Reabrir
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntry.mutate(e.id)}
                      >
                        Excluir
                      </Button>
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
