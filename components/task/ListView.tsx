"use client";

import {
  IconBan,
  IconCheck,
  IconLayoutList,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  EMPTY_LIST_FILTERS,
  filterTasks,
  groupTasks,
  sortTasks,
  type GroupBy,
  type ListFilters,
  type SortBy,
} from "@/lib/task/list-view";
import { useClients } from "@/lib/queries/useClients";
import { useBulkTaskActions } from "@/lib/queries/useBulkTasks";
import { useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import {
  countOpenSubtasks,
  useCompleteTask,
  useDeleteTask,
  useToggleTaskCancel,
  useToggleTaskComplete,
  useTasks,
} from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sectorOptions } from "@/lib/sectors/options";
import type { Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskRow } from "./TaskRow";

const STATUS_OPTIONS = [
  { value: "todas", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "atrasada", label: "Atrasadas" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
];
const PRIORITY_OPTIONS = [
  { value: "__all__", label: "Todas" },
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Normal" },
  { value: "baixa", label: "Baixa" },
  { value: "sem_prioridade", label: "Sem prioridade" },
];
const DUE_OPTIONS = [
  { value: "__all__", label: "Qualquer prazo" },
  { value: "7", label: "Próximos 7 dias" },
  { value: "14", label: "Próximos 14 dias" },
  { value: "30", label: "Próximos 30 dias" },
];
const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "Sem agrupamento" },
  { value: "overdue", label: "Atrasadas" },
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "client", label: "Cliente" },
  { value: "assignee", label: "Responsável" },
  { value: "status", label: "Status" },
  { value: "no_date", label: "Com/sem data" },
];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "due", label: "Prazo" },
  { value: "priority", label: "Prioridade" },
  { value: "client", label: "Cliente" },
  { value: "created", label: "Criação" },
  { value: "updated", label: "Atualização" },
];

/**
 * Cada filtro tem a largura do próprio rótulo, com teto. Largura fixa cortava
 * "Todos os responsáveis" — e um filtro que não diz o que está filtrando não
 * serve. A barra já quebra em outra linha quando falta espaço.
 */
const FILTER_W = "max-w-60";

export function ListView() {
  const workspace = useWorkspace();
  const { data: tasks = [], isLoading } = useTasks(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const { openPanel } = useShell();

  const toggle = useToggleTaskComplete(workspace.id);
  const complete = useCompleteTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const toggleCancel = useToggleTaskCancel(workspace.id);
  const bulk = useBulkTaskActions(workspace.id);

  const [filters, setFilters] = useState<ListFilters>(EMPTY_LIST_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("due");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ task: Task; count: number } | null>(
    null
  );

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients]
  );
  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.display_name ?? m.email])),
    [members]
  );

  const filtered = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const sorted = useMemo(
    () => sortTasks(filtered, sortBy, clientNameById),
    [filtered, sortBy, clientNameById]
  );
  const groups = useMemo(
    () => groupTasks(sorted, groupBy, { clientNameById, memberNameById }),
    [sorted, groupBy, clientNameById, memberNameById]
  );

  const hasFilters =
    filters.q.trim() !== "" ||
    filters.status !== "todas" ||
    filters.sectorIds.length > 0 ||
    filters.priorities.length > 0 ||
    !!filters.clientId ||
    !!filters.assigneeId ||
    filters.dueWithinDays !== null;

  async function handleToggle(task: Task, completed: boolean) {
    if (!completed) {
      toggle.mutate({ id: task.id, completed: false });
      return;
    }
    const open = await countOpenSubtasks(task.id);
    if (open > 0) {
      setConfirm({ task, count: open });
      return;
    }
    toggle.mutate({ id: task.id, completed: true });
  }

  function toggleSelect(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const selectedIds = [...selected];

  function runBulk(action: (ids: string[]) => void) {
    action(selectedIds);
    setSelected(new Set());
  }

  const totalVisible = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-app)] flex-col gap-[var(--space-block-gap)] px-4 pb-8 lg:px-6">
      {/* Barra de ferramentas contida: busca, filtros e, à direita, o que
          controla a apresentação (agrupar/ordenar). */}
      <div className="border-line bg-card flex flex-col gap-3 rounded-md border p-3 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <IconSearch
              aria-hidden
              size={16}
              stroke={1.75}
              className="text-fg-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Buscar por título…"
              aria-label="Buscar demandas"
              className="border-line bg-page text-fg placeholder:text-fg-muted h-9 w-full rounded-sm border pr-3 pl-9 text-[length:var(--text-small-size)]"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className={FILTER_W}>
              <Select
                options={GROUP_OPTIONS}
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as GroupBy)}
                aria-label="Agrupar por"
              />
            </div>
            <div className={FILTER_W}>
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortBy)}
                aria-label="Ordenar por"
              />
            </div>
          </div>
        </div>

        <div className="border-line flex flex-wrap items-center gap-2 border-t pt-3">
          <div className={FILTER_W}>
            <Select
              options={STATUS_OPTIONS}
              value={filters.status}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  status: v as ListFilters["status"],
                }))
              }
              aria-label="Status"
            />
          </div>
          <div className={FILTER_W}>
            <Select
              options={[
                { value: "__all__", label: "Todos os setores" },
                ...sectorOptions(sectors),
              ]}
              value={filters.sectorIds[0] ?? "__all__"}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  sectorIds: v === "__all__" ? [] : [v],
                }))
              }
              aria-label="Setor"
            />
          </div>
          <div className={FILTER_W}>
            <Select
              options={PRIORITY_OPTIONS}
              value={filters.priorities[0] ?? "__all__"}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  priorities: v === "__all__" ? [] : [v],
                }))
              }
              aria-label="Prioridade"
            />
          </div>
          <div className={FILTER_W}>
            <Select
              options={[
                { value: "__all__", label: "Todos os clientes" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={filters.clientId ?? "__all__"}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  clientId: v === "__all__" ? null : v,
                }))
              }
              aria-label="Cliente"
            />
          </div>
          <div className={FILTER_W}>
            <Select
              options={[
                { value: "__all__", label: "Todos os responsáveis" },
                ...members.map((m) => ({
                  value: m.user_id,
                  label: m.display_name ?? m.email,
                })),
              ]}
              value={filters.assigneeId ?? "__all__"}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  assigneeId: v === "__all__" ? null : v,
                }))
              }
              aria-label="Responsável"
            />
          </div>
          <div className={FILTER_W}>
            <Select
              options={DUE_OPTIONS}
              value={
                filters.dueWithinDays
                  ? String(filters.dueWithinDays)
                  : "__all__"
              }
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  dueWithinDays:
                    v === "__all__" ? null : (Number(v) as 7 | 14 | 30),
                }))
              }
              aria-label="Prazo"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span
              aria-live="polite"
              className="tnum text-fg-secondary text-[length:var(--text-small-size)]"
            >
              {totalVisible} demanda{totalVisible === 1 ? "" : "s"}
            </span>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_LIST_FILTERS)}
                className="text-fg-link text-[length:var(--text-small-size)] whitespace-nowrap hover:underline"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="tf-glass-strong sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-md px-3 py-2">
          <span className="tnum text-fg text-[length:var(--text-small-size)] font-medium">
            {selected.size} selecionada{selected.size === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={IconCheck}
              onClick={() => runBulk((ids) => bulk.complete.mutate(ids))}
            >
              Concluir
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={IconBan}
              onClick={() => runBulk((ids) => bulk.cancel.mutate(ids))}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              leadingIcon={IconTrash}
              onClick={() => runBulk((ids) => bulk.remove.mutate(ids))}
            >
              Excluir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={IconX}
              onClick={() => setSelected(new Set())}
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={IconLayoutList}
          title={
            hasFilters ? "Nenhuma demanda encontrada" : "Nenhuma demanda ainda"
          }
          description={
            hasFilters
              ? "Ajuste os filtros para ver outros resultados"
              : "As demandas do workspace aparecem aqui"
          }
        />
      ) : (
        <div className="flex flex-col gap-[var(--space-block-gap)]">
          {groups.map((group) => (
            <section
              key={group.key}
              className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]"
            >
              {groupBy !== "none" ? (
                <header className="border-line flex items-center gap-2 border-b px-4 py-2.5">
                  <h2 className="text-fg text-[length:var(--text-small-size)] font-semibold">
                    {group.label}
                  </h2>
                  <span className="tnum bg-sunken text-fg-secondary rounded-xs px-1.5 py-0.5 text-[length:var(--text-caption-size)] font-medium">
                    {group.tasks.length}
                  </span>
                </header>
              ) : null}
              <ul className="flex flex-col p-1">
                {group.tasks.map((task) => (
                  <li key={task.id}>
                    <TaskRow
                      task={task}
                      sector={sectorsById.get(task.sector_id)}
                      selected={selected.has(task.id)}
                      onSelectChange={(on) => toggleSelect(task.id, on)}
                      onToggle={(c) => handleToggle(task, c)}
                      onToggleCancel={(cancel) =>
                        toggleCancel.mutate({ id: task.id, cancel })
                      }
                      onDelete={() => deleteTask(task)}
                      onOpen={() =>
                        openPanel({
                          title: "Tarefa",
                          node: <TaskDetailPanel taskId={task.id} />,
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {confirm ? (
        <ConfirmCompleteDialog
          open
          count={confirm.count}
          onOpenChange={(o) => {
            if (!o) setConfirm(null);
          }}
          onCompleteAll={() => {
            complete.mutate({ id: confirm.task.id, alsoSubtasks: true });
            setConfirm(null);
          }}
          onCompleteTaskOnly={() => {
            toggle.mutate({ id: confirm.task.id, completed: true });
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
