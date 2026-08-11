"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { IconAlertTriangle, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  addMonths,
  differenceInCalendarDays,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { HoverCard } from "radix-ui";
import { useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useProjects } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks, useUpdateTask } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { weekSegments, type ProjectSegment } from "@/lib/utils/calendar-bars";
import { WEEKDAYS, monthGrid } from "@/lib/utils/calendar-grid";
import { projectStatusLabels } from "@/lib/validation/project";
import type { Project, Sector, Task } from "@/types/database";

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const BAR_H = 18; // px por linha de barra

function TaskChip({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      {...listeners}
      {...attributes}
      className={`w-full cursor-grab truncate rounded-sm bg-sunken px-1 text-left text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-selected ${
        isDragging ? "opacity-50" : ""
      } ${task.completed_at ? "text-done line-through" : "text-fg"}`}
    >
      {task.title}
    </button>
  );
}

function ProjectPeek({
  project,
  sector,
  tasks,
}: {
  project: Project;
  sector?: Sector;
  tasks: Task[];
}) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed_at !== null).length;
  const open = tasks.filter((t) => t.completed_at === null && t.due_date);
  const nextDue = open
    .map((t) => t.due_date as string)
    .sort((a, b) => a.localeCompare(b))[0];
  const overdue = open.some(
    (t) => differenceInCalendarDays(parseISO(t.due_date as string), new Date()) < 0
  );
  const period =
    project.starts_on && project.ends_on
      ? `${format(parseISO(project.starts_on), "d MMM", { locale: ptBR })} — ${format(parseISO(project.ends_on), "d MMM", { locale: ptBR })}`
      : null;

  return (
    <div className="flex w-64 flex-col gap-2 rounded-md border border-line bg-card p-3 shadow-[var(--shadow-peek)]">
      <div className="flex items-center gap-2">
        <span className="font-medium text-fg">{project.name}</span>
      </div>
      <div className="flex items-center gap-2 text-[length:var(--text-caption-size)] text-fg-secondary">
        {sector ? (
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: sector.color }}
            />
            {sector.name}
          </span>
        ) : null}
        <span>·</span>
        <span>{projectStatusLabels[project.status]}</span>
      </div>
      {period ? (
        <span className="tnum text-[length:var(--text-caption-size)] text-fg-secondary">
          {period}
        </span>
      ) : null}
      <ProgressBar value={total === 0 ? 0 : (done / total) * 100} label={`${done} de ${total} concluídas`} />
      <span className="tnum text-[length:var(--text-caption-size)] text-fg-muted">
        {done} de {total} tarefas
      </span>
      {nextDue ? (
        <span className="text-[length:var(--text-caption-size)] text-fg-secondary">
          Próximo prazo: {format(parseISO(nextDue), "d MMM", { locale: ptBR })}
        </span>
      ) : null}
      {overdue ? (
        <span className="inline-flex items-center gap-1 text-[length:var(--text-caption-size)] text-overdue">
          <IconAlertTriangle size={13} stroke={1.5} aria-hidden />
          Tem tarefa atrasada
        </span>
      ) : null}
    </div>
  );
}

function ProjectBar({
  segment,
  col,
  project,
  sector,
  tasks,
}: {
  segment: ProjectSegment;
  col: number;
  project: Project;
  sector?: Sector;
  tasks: Task[];
}) {
  const color = sector?.color ?? "var(--brand-500)";
  const roundStart = segment.isStart && col === segment.startCol;
  const roundEnd = segment.isEnd && col === segment.endCol;

  return (
    <HoverCard.Root openDelay={350} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <Link
          href={`/projeto/${project.id}`}
          className="flex h-full items-center overflow-hidden px-1 text-[length:var(--text-caption-size)] text-fg"
          style={{
            background: `color-mix(in srgb, ${color} 20%, var(--surface-card))`,
            borderLeft:
              segment.isStart && col === segment.startCol
                ? `2px solid ${color}`
                : undefined,
            borderTopLeftRadius: roundStart ? 4 : 0,
            borderBottomLeftRadius: roundStart ? 4 : 0,
            borderTopRightRadius: roundEnd ? 4 : 0,
            borderBottomRightRadius: roundEnd ? 4 : 0,
          }}
        >
          {segment.isStart && col === segment.startCol ? (
            <span className="truncate">{project.name}</span>
          ) : null}
        </Link>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="top" sideOffset={4} className="z-50">
          <ProjectPeek project={project} sector={sector} tasks={tasks} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function DayCell({
  day,
  month,
  col,
  segments,
  maxRow,
  showProjects,
  dayTasks,
  projectsById,
  sectorsById,
  tasksByProject,
  onOpen,
}: {
  day: Date;
  month: Date;
  col: number;
  segments: ProjectSegment[];
  maxRow: number;
  showProjects: boolean;
  dayTasks: Task[];
  projectsById: Map<string, Project>;
  sectorsById: Map<string, Sector>;
  tasksByProject: Map<string, Task[]>;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day) });
  const inMonth = isSameMonth(day, month);
  const today = isToday(day);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-24 flex-col gap-0.5 p-1 ${today ? "bg-today" : "bg-page"} ${inMonth ? "" : "opacity-40"} ${isOver ? "ring-1 ring-inset ring-[var(--focus-ring)]" : ""}`}
    >
      <span
        className={`tnum text-[length:var(--text-caption-size)] ${today ? "font-medium text-fg" : "text-fg-muted"}`}
      >
        {format(day, "d")}
      </span>

      {showProjects && maxRow > 0 ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: maxRow }, (_, row) => {
            const seg = segments.find(
              (s) => s.row === row && col >= s.startCol && col <= s.endCol
            );
            const project = seg ? projectsById.get(seg.projectId) : undefined;
            return (
              <div key={row} style={{ height: BAR_H }}>
                {seg && project ? (
                  <ProjectBar
                    segment={seg}
                    col={col}
                    project={project}
                    sector={sectorsById.get(project.sector_id)}
                    tasks={tasksByProject.get(project.id) ?? []}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-col gap-0.5">
        {dayTasks.slice(0, 3).map((t) => (
          <TaskChip key={t.id} task={t} onOpen={() => onOpen(t.id)} />
        ))}
        {dayTasks.length > 3 ? (
          <span className="px-1 text-[length:var(--text-caption-size)] text-fg-muted">
            +{dayTasks.length - 3}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarView() {
  const workspace = useWorkspace();
  const { data: tasks = [] } = useTasks(workspace.id);
  const { data: projects = [] } = useProjects(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const update = useUpdateTask(workspace.id);
  const { openPanel } = useShell();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [layers, setLayers] = useState({ tasks: true, projects: true });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const weeks = monthGrid(month);

  const tasksByDay = new Map<string, Task[]>();
  const tasksByProject = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.due_date && layers.tasks) {
      const list = tasksByDay.get(t.due_date) ?? [];
      list.push(t);
      tasksByDay.set(t.due_date, list);
    }
    if (t.project_id) {
      const list = tasksByProject.get(t.project_id) ?? [];
      list.push(t);
      tasksByProject.set(t.project_id, list);
    }
  }
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const sectorsById = new Map(sectors.map((s) => [s.id, s]));

  function openTask(id: string) {
    openPanel({ title: "Tarefa", node: <TaskDetailPanel taskId={id} /> });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    update.mutate({
      id: String(active.id),
      patch: { due_date: String(over.id) },
    });
  }

  function toggleLayer(layer: "tasks" | "projects") {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-[length:var(--text-h2-size)] font-medium capitalize text-fg">
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>

        <div className="flex items-center gap-1">
          {(["tasks", "projects"] as const).map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => toggleLayer(layer)}
              aria-pressed={layers[layer]}
              className={`rounded-full px-3 py-1 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] ${
                layers[layer]
                  ? "bg-selected text-fg"
                  : "text-fg-secondary hover:bg-sunken"
              }`}
            >
              {layer === "tasks" ? "Tarefas" : "Projetos"}
            </button>
          ))}
        </div>

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

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line">
          {weeks.map((week, wi) => {
            const segments = layers.projects ? weekSegments(week, projects) : [];
            const maxRow = segments.reduce((m, s) => Math.max(m, s.row + 1), 0);
            return (
              <div
                key={wi}
                className="grid flex-1 grid-cols-7 gap-px border-t border-line bg-line first:border-t-0"
              >
                {week.map((day, col) => (
                  <DayCell
                    key={dayKey(day)}
                    day={day}
                    month={month}
                    col={col}
                    segments={segments}
                    maxRow={maxRow}
                    showProjects={layers.projects}
                    dayTasks={tasksByDay.get(dayKey(day)) ?? []}
                    projectsById={projectsById}
                    sectorsById={sectorsById}
                    tasksByProject={tasksByProject}
                    onOpen={openTask}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
