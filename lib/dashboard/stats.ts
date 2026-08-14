import { differenceInCalendarDays, parseISO } from "date-fns";

import type { Member } from "@/lib/queries/useMembers";
import type { Client, Sector, Task } from "@/types/database";

export type SectorBucket = {
  id: string;
  name: string;
  color: string;
  open: number;
};
export type ClientBucket = { id: string; name: string; open: number };
export type AssigneeBucket = {
  id: string; // user_id ou "__none__"
  name: string;
  open: number;
  done30: number;
};

export type DashboardStats = {
  total: number;
  open: number;
  overdue: number;
  dueSoon: number;
  done30: number;
  bySector: SectorBucket[];
  byClient: ClientBucket[];
  byAssignee: AssigneeBucket[];
};

const UNASSIGNED = "__none__";

// Agregação do painel gerencial. Pura e testável: recebe `now` (default é o
// momento da chamada — feita fora do corpo de render, então não fere a regra
// de pureza do React Compiler).
export function computeDashboard(
  input: {
    tasks: Task[];
    sectors: Sector[];
    clients: Client[];
    members: Member[];
  },
  now: Date = new Date()
): DashboardStats {
  const { tasks, sectors, clients, members } = input;

  const sectorById = new Map(sectors.map((s) => [s.id, s]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const memberById = new Map(members.map((m) => [m.user_id, m]));

  const sectorOpen = new Map<string, number>();
  const clientOpen = new Map<string, number>();
  const assigneeOpen = new Map<string, number>();
  const assigneeDone = new Map<string, number>();

  let open = 0;
  let overdue = 0;
  let dueSoon = 0;
  let done30 = 0;

  for (const t of tasks) {
    if (t.completed_at) {
      const daysAgo = differenceInCalendarDays(now, parseISO(t.completed_at));
      if (daysAgo >= 0 && daysAgo <= 30) {
        done30 += 1;
        const key = t.assignee_id ?? UNASSIGNED;
        assigneeDone.set(key, (assigneeDone.get(key) ?? 0) + 1);
      }
      continue;
    }

    // Aberta
    open += 1;

    if (t.due_date) {
      const diff = differenceInCalendarDays(parseISO(t.due_date), now);
      if (diff < 0) overdue += 1;
      else if (diff <= 7) dueSoon += 1;
    }

    sectorOpen.set(t.sector_id, (sectorOpen.get(t.sector_id) ?? 0) + 1);
    if (t.client_id) {
      clientOpen.set(t.client_id, (clientOpen.get(t.client_id) ?? 0) + 1);
    }
    const akey = t.assignee_id ?? UNASSIGNED;
    assigneeOpen.set(akey, (assigneeOpen.get(akey) ?? 0) + 1);
  }

  const bySector: SectorBucket[] = [...sectorOpen.entries()]
    .map(([id, count]) => {
      const s = sectorById.get(id);
      return {
        id,
        name: s?.name ?? "Sem setor",
        color: s?.color ?? "var(--tone-neutral)",
        open: count,
      };
    })
    .sort((a, b) => b.open - a.open);

  const byClient: ClientBucket[] = [...clientOpen.entries()]
    .map(([id, count]) => ({
      id,
      name: clientById.get(id)?.name ?? "Cliente removido",
      open: count,
    }))
    .sort((a, b) => b.open - a.open)
    .slice(0, 5);

  const assigneeIds = new Set<string>([
    ...assigneeOpen.keys(),
    ...assigneeDone.keys(),
  ]);
  const byAssignee: AssigneeBucket[] = [...assigneeIds]
    .map((id) => {
      const m = id === UNASSIGNED ? undefined : memberById.get(id);
      return {
        id,
        name:
          id === UNASSIGNED
            ? "Sem responsável"
            : (m?.display_name ?? m?.email ?? "Removido"),
        open: assigneeOpen.get(id) ?? 0,
        done30: assigneeDone.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.open - a.open || b.done30 - a.done30);

  return {
    total: tasks.length,
    open,
    overdue,
    dueSoon,
    done30,
    bySector,
    byClient,
    byAssignee,
  };
}
