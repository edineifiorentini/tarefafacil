import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

import type { Task } from "@/types/database";

export type GroupBy =
  | "none"
  | "overdue"
  | "day"
  | "week"
  | "client"
  | "assignee"
  | "status"
  | "no_date";
export type SortBy = "due" | "priority" | "client" | "created" | "updated";
export type StatusFilter =
  "todas" | "aberta" | "concluida" | "cancelada" | "atrasada";

export type ListFilters = {
  q: string;
  status: StatusFilter;
  sectorIds: string[];
  priorities: string[];
  clientId: string | null;
  assigneeId: string | null;
  dueWithinDays: 7 | 14 | 30 | null;
};

export const EMPTY_LIST_FILTERS: ListFilters = {
  q: "",
  status: "todas",
  sectorIds: [],
  priorities: [],
  clientId: null,
  assigneeId: null,
  dueWithinDays: null,
};

const STATUS_VALIDOS: StatusFilter[] = [
  "todas",
  "aberta",
  "concluida",
  "cancelada",
  "atrasada",
];

/**
 * Os filtros escritos na URL.
 *
 * Existe para o relatório poder mandar alguém para cá já filtrado: clicar
 * em "4 atrasadas" abre a Lista nas quatro. Sem isto, o número do relatório
 * seria um beco — dá para ver que existem quatro e não dá para ver QUAIS.
 *
 * **Tudo é validado.** A barra de endereço é entrada de usuário como
 * qualquer outra, e um `?status=xyz` colado ali não pode virar um filtro
 * inválido que esconde a lista inteira sem explicar por quê. Valor
 * desconhecido é ignorado, e o filtro fica no padrão.
 */
export function filtrosDaURL(params: URLSearchParams): ListFilters {
  const status = params.get("status") ?? "";
  const prazo = Number(params.get("prazo"));
  const setores = (params.get("setores") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ...EMPTY_LIST_FILTERS,
    status: STATUS_VALIDOS.includes(status as StatusFilter)
      ? (status as StatusFilter)
      : "todas",
    sectorIds: setores,
    assigneeId: params.get("responsavel") || null,
    // Só os três horizontes que o seletor oferece: um "?prazo=3" viraria um
    // estado que a interface não consegue mostrar nem desfazer.
    dueWithinDays:
      prazo === 7 || prazo === 14 || prazo === 30
        ? (prazo as 7 | 14 | 30)
        : null,
  };
}

const PRIORITY_RANK: Record<string, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
  sem_prioridade: 4,
};

export function isOverdue(t: Task, now: Date): boolean {
  return (
    !t.completed_at &&
    !t.cancelled_at &&
    !!t.due_date &&
    differenceInCalendarDays(parseISO(t.due_date), now) < 0
  );
}

export function filterTasks(
  tasks: Task[],
  f: ListFilters,
  now: Date = new Date()
): Task[] {
  const q = f.q.trim().toLowerCase();
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (f.sectorIds.length && !f.sectorIds.includes(t.sector_id)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.clientId && t.client_id !== f.clientId) return false;
    if (f.assigneeId && t.assignee_id !== f.assigneeId) return false;

    switch (f.status) {
      case "aberta":
        if (t.completed_at || t.cancelled_at) return false;
        break;
      case "concluida":
        if (!t.completed_at) return false;
        break;
      case "cancelada":
        if (!t.cancelled_at) return false;
        break;
      case "atrasada":
        if (!isOverdue(t, now)) return false;
        break;
      default:
        break;
    }

    if (f.dueWithinDays != null) {
      if (!t.due_date || t.completed_at || t.cancelled_at) return false;
      const diff = differenceInCalendarDays(parseISO(t.due_date), now);
      if (diff < 0 || diff > f.dueWithinDays) return false;
    }
    return true;
  });
}

export function sortTasks(
  tasks: Task[],
  sortBy: SortBy,
  clientNameById: Map<string, string>
): Task[] {
  const arr = [...tasks];
  arr.sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return (
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
        );
      case "client":
        return (clientNameById.get(a.client_id ?? "") ?? "").localeCompare(
          clientNameById.get(b.client_id ?? "") ?? ""
        );
      case "created":
        return b.created_at.localeCompare(a.created_at);
      case "updated":
        return b.updated_at.localeCompare(a.updated_at);
      case "due":
      default:
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
    }
  });
  return arr;
}

export type TaskGroup = { key: string; label: string; tasks: Task[] };

export function groupTasks(
  tasks: Task[],
  groupBy: GroupBy,
  ctx: {
    clientNameById: Map<string, string>;
    memberNameById: Map<string, string>;
  },
  now: Date = new Date()
): TaskGroup[] {
  if (groupBy === "none") {
    return tasks.length ? [{ key: "all", label: "Todas", tasks }] : [];
  }

  const buckets = new Map<string, TaskGroup>();
  function push(key: string, label: string, t: Task) {
    let g = buckets.get(key);
    if (!g) {
      g = { key, label, tasks: [] };
      buckets.set(key, g);
    }
    g.tasks.push(t);
  }

  for (const t of tasks) {
    switch (groupBy) {
      case "overdue": {
        const overdue = isOverdue(t, now);
        push(overdue ? "overdue" : "ok", overdue ? "Atrasadas" : "No prazo", t);
        break;
      }
      case "day": {
        push(t.due_date ?? "no_date", t.due_date ?? "Sem data", t);
        break;
      }
      case "week": {
        if (!t.due_date) {
          push("no_date", "Sem data", t);
          break;
        }
        const start = startOfWeek(parseISO(t.due_date), { weekStartsOn: 1 });
        const key = start.toISOString().slice(0, 10);
        push(key, `Semana de ${format(start, "dd/MM")}`, t);
        break;
      }
      case "client": {
        const id = t.client_id ?? "none";
        push(
          id,
          t.client_id
            ? (ctx.clientNameById.get(t.client_id) ?? "Cliente removido")
            : "Sem cliente",
          t
        );
        break;
      }
      case "assignee": {
        const id = t.assignee_id ?? "none";
        push(
          id,
          t.assignee_id
            ? (ctx.memberNameById.get(t.assignee_id) ?? "Removido")
            : "Sem responsável",
          t
        );
        break;
      }
      case "status": {
        const key = t.cancelled_at
          ? "cancelada"
          : t.completed_at
            ? "concluida"
            : "aberta";
        const label =
          key === "cancelada"
            ? "Canceladas"
            : key === "concluida"
              ? "Concluídas"
              : "Abertas";
        push(key, label, t);
        break;
      }
      case "no_date": {
        push(
          t.due_date ? "with_date" : "no_date",
          t.due_date ? "Com data" : "Sem data",
          t
        );
        break;
      }
    }
  }
  return [...buckets.values()];
}
