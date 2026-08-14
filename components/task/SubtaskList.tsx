"use client";

import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useState } from "react";
import type { FormEvent } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { TextInput } from "@/components/ui/TextInput";
import {
  useCreateSubtask,
  useDeleteSubtask,
  useSubtasks,
  useToggleSubtask,
  useUpdateSubtask,
} from "@/lib/queries/useSubtasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Subtask } from "@/types/database";

function isLate(due: string | null, parentDue: string | null) {
  if (!due || !parentDue) return false;
  return differenceInCalendarDays(parseISO(due), parseISO(parentDue)) > 0;
}

function SubtaskItem({
  subtask,
  late,
  onToggle,
  onRename,
  onDate,
  onDelete,
}: {
  subtask: Subtask;
  late: boolean;
  onToggle: (completed: boolean) => void;
  onRename: (title: string) => void;
  onDate: (due: string | null) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(subtask.title);
  const done = subtask.completed_at !== null;

  return (
    <div className="group flex items-center gap-2 py-1">
      <Checkbox
        variant="round"
        checked={done}
        onCheckedChange={(c) => onToggle(c === true)}
        aria-label={done ? "Reabrir etapa" : "Concluir etapa"}
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          const trimmed = title.trim();
          if (trimmed && trimmed !== subtask.title) onRename(trimmed);
        }}
        aria-label="Título da etapa"
        className={`min-w-0 flex-1 bg-transparent text-[length:var(--text-small-size)] outline-none ${
          done ? "text-done line-through" : "text-fg"
        }`}
      />
      {late ? (
        <span
          className="text-due-soon inline-flex items-center"
          title="Data posterior ao prazo da tarefa"
        >
          <IconAlertTriangle size={13} stroke={1.5} aria-hidden />
          <span className="sr-only">Data posterior ao prazo da tarefa</span>
        </span>
      ) : null}
      <input
        type="date"
        value={subtask.due_date ?? ""}
        onChange={(e) => onDate(e.target.value || null)}
        aria-label="Data da etapa"
        className="tnum border-line bg-card text-fg-secondary rounded-sm border px-1 text-[length:var(--text-caption-size)]"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Excluir etapa"
        className="text-fg-muted hover:text-fg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <IconTrash size={14} stroke={1.5} />
      </button>
    </div>
  );
}

export function SubtaskList({
  taskId,
  parentDue,
}: {
  taskId: string;
  parentDue: string | null;
}) {
  const workspace = useWorkspace();
  const { data: subtasks = [] } = useSubtasks(workspace.id, taskId);
  const create = useCreateSubtask(workspace.id, taskId);
  const toggle = useToggleSubtask(workspace.id, taskId);
  const updateSub = useUpdateSubtask(workspace.id, taskId);
  const del = useDeleteSubtask(workspace.id, taskId);
  const [newTitle, setNewTitle] = useState("");

  function addSubtask(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    create.mutate({ title: trimmed });
    setNewTitle("");
  }

  const doneCount = subtasks.filter((s) => s.completed_at !== null).length;

  return (
    <div className="flex flex-col gap-1">
      {subtasks.length > 0 ? (
        <span className="tnum text-fg-muted text-[length:var(--text-caption-size)]">
          {doneCount} de {subtasks.length}
        </span>
      ) : null}

      {subtasks.map((st) => (
        <SubtaskItem
          key={st.id}
          subtask={st}
          late={isLate(st.due_date, parentDue)}
          onToggle={(c) => toggle.mutate({ id: st.id, completed: c })}
          onRename={(title) => updateSub.mutate({ id: st.id, title })}
          onDate={(due) => updateSub.mutate({ id: st.id, due_date: due })}
          onDelete={() => del.mutate(st.id)}
        />
      ))}

      <form onSubmit={addSubtask} className="mt-1">
        <TextInput
          size="sm"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Adicionar etapa e Enter"
          aria-label="Nova etapa"
        />
      </form>
    </div>
  );
}
