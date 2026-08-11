"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useShell } from "@/components/shell/shell-context";
import { useDatedSubtasks, useToggleDatedSubtask } from "@/lib/queries/useHoje";
import { useSectors } from "@/lib/queries/useSectors";
import {
  countOpenSubtasks,
  useCompleteTask,
  useDeleteTask,
  useTasks,
  useToggleTaskComplete,
} from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Subtask, Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { DueChip } from "./DueChip";
import { QuickAdd } from "./QuickAdd";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskRow } from "./TaskRow";

type Group = "atrasadas" | "hoje" | "proximos";
type Item =
  | { kind: "task"; due: string; task: Task }
  | { kind: "subtask"; due: string; subtask: Subtask };

const GROUP_LABELS: Record<Group, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  proximos: "Próximos 7 dias",
};

function groupOf(due: string): Group | null {
  const diff = differenceInCalendarDays(parseISO(due), new Date());
  if (diff < 0) return "atrasadas";
  if (diff === 0) return "hoje";
  if (diff >= 1 && diff <= 7) return "proximos";
  return null;
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 flex items-center gap-2 text-[length:var(--text-h3-size)] font-medium text-fg">
        {title}
        <span className="tnum text-[length:var(--text-small-size)] font-normal text-fg-muted">
          {count}
        </span>
      </h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function HojeView() {
  const workspace = useWorkspace();
  const { data: tasks = [] } = useTasks(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: datedSubtasks = [] } = useDatedSubtasks(workspace.id);
  const toggle = useToggleTaskComplete(workspace.id);
  const complete = useCompleteTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const toggleSub = useToggleDatedSubtask(workspace.id);
  const { openPanel } = useShell();

  const [confirm, setConfirm] = useState<{ task: Task; count: number } | null>(
    null
  );

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  const items: Item[] = [
    ...tasks
      .filter((t) => t.completed_at === null && t.due_date !== null)
      .map((t) => ({ kind: "task" as const, due: t.due_date as string, task: t })),
    ...datedSubtasks.map((s) => ({
      kind: "subtask" as const,
      due: s.due_date as string,
      subtask: s,
    })),
  ];

  const groups: Record<Group, Item[]> = {
    atrasadas: [],
    hoje: [],
    proximos: [],
  };
  for (const item of items) {
    const g = groupOf(item.due);
    if (g) groups[g].push(item);
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => a.due.localeCompare(b.due));
  }

  const total =
    groups.atrasadas.length + groups.hoje.length + groups.proximos.length;

  function openTask(id: string) {
    openPanel({ title: "Tarefa", node: <TaskDetailPanel taskId={id} /> });
  }

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

  function renderItem(item: Item) {
    if (item.kind === "task") {
      const t = item.task;
      return (
        <TaskRow
          key={`t-${t.id}`}
          task={t}
          sector={sectorsById.get(t.sector_id)}
          onToggle={(c) => handleToggle(t, c)}
          onDelete={() => deleteTask(t)}
          onOpen={() => openTask(t.id)}
        />
      );
    }
    const s = item.subtask;
    const parent = tasksById.get(s.task_id);
    return (
      <div
        key={`s-${s.id}`}
        className="group flex items-center gap-3 rounded-sm py-1 pl-8 pr-2 hover:bg-sunken"
      >
        <Checkbox
          variant="round"
          checked={false}
          onCheckedChange={() => toggleSub.mutate(s.id)}
          aria-label="Concluir etapa"
        />
        <button
          type="button"
          onClick={() => parent && openTask(parent.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="truncate text-[length:var(--text-small-size)] text-fg">
            {s.title}
          </span>
          {parent ? (
            <span className="shrink-0 text-[length:var(--text-caption-size)] text-fg-muted">
              · {parent.title}
            </span>
          ) : null}
        </button>
        <DueChip date={item.due} />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="mx-auto max-w-[var(--max-width-read)] px-6 py-12">
        <div className="rounded-md border border-line bg-card p-8 text-center">
          <p className="text-[length:var(--text-h3-size)] font-medium text-fg">
            Seu dia está livre
          </p>
          <p className="mt-1 text-fg-secondary">
            Nada com prazo para agora. Registre a próxima tarefa.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="primary"
              onClick={() =>
                openPanel({ title: "Nova tarefa", node: <QuickAdd /> })
              }
            >
              Nova tarefa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[var(--max-width-read)] px-6 py-8">
      {(["atrasadas", "hoje", "proximos"] as const).map((g) =>
        groups[g].length > 0 ? (
          <Section key={g} title={GROUP_LABELS[g]} count={groups[g].length}>
            {groups[g].map(renderItem)}
          </Section>
        ) : null
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
