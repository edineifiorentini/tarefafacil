"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { addMonths, format, isSameMonth, isToday, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { WEEKDAYS, monthGrid } from "@/lib/utils/calendar-grid";
import type { Task } from "@/types/database";

export function CalendarView() {
  const workspace = useWorkspace();
  const { data: tasks = [] } = useTasks(workspace.id);
  const { openPanel } = useShell();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const weeks = monthGrid(month);

  const tasksByDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.due_date) continue;
    const list = tasksByDay.get(t.due_date) ?? [];
    list.push(t);
    tasksByDay.set(t.due_date, list);
  }

  function openTask(id: string) {
    openPanel({ title: "Tarefa", node: <TaskDetailPanel taskId={id} /> });
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-[length:var(--text-h2-size)] font-medium capitalize text-fg">
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            icon={IconChevronLeft}
            label="Mês anterior"
            variant="ghost"
            size="sm"
            onClick={() => setMonth(addMonths(month, -1))}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Hoje
          </Button>
          <IconButton
            icon={IconChevronRight}
            label="Próximo mês"
            variant="ghost"
            size="sm"
            onClick={() => setMonth(addMonths(month, 1))}
          />
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="pb-1 text-center text-[length:var(--text-caption-size)] text-fg-muted"
          >
            {w}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line"
        style={{
          gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))`,
        }}
      >
        {weeks.flat().map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`flex min-h-24 flex-col gap-1 overflow-hidden p-1 ${
                today ? "bg-today" : "bg-page"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`tnum text-[length:var(--text-caption-size)] ${
                  today ? "font-medium text-fg" : "text-fg-muted"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTask(t.id)}
                    className={`truncate rounded-sm bg-sunken px-1 text-left text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-selected ${
                      t.completed_at ? "text-done line-through" : "text-fg"
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 ? (
                  <span className="px-1 text-[length:var(--text-caption-size)] text-fg-muted">
                    +{dayTasks.length - 3}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
