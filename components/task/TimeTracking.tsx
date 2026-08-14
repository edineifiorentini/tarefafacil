"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useMembers } from "@/lib/queries/useMembers";
import {
  useAddTimeEntry,
  useDeleteTimeEntry,
  useTimeEntries,
} from "@/lib/queries/useTaskTime";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { PomodoroControl } from "./PomodoroControl";

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function TimeTracking({
  taskId,
  taskTitle,
  estimateMinutes,
}: {
  taskId: string;
  taskTitle: string;
  estimateMinutes: number | null;
}) {
  const workspace = useWorkspace();
  const { data: entries = [] } = useTimeEntries(taskId);
  const { data: members = [] } = useMembers(workspace.id);
  const add = useAddTimeEntry(workspace.id, taskId);
  const remove = useDeleteTimeEntry(taskId);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  const overEstimate = !!estimateMinutes && total > estimateMinutes;
  const pomodoroCount = entries.filter((e) => e.source === "pomodoro").length;

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(minutes, 10);
    if (!parsed || parsed <= 0) return;
    add.mutate(
      { minutes: parsed, note: note.trim() || null },
      { onSuccess: () => { setMinutes(""); setNote(""); } }
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PomodoroControl taskId={taskId} taskTitle={taskTitle} pomodoroCount={pomodoroCount} />

      <p className="text-[length:var(--text-small-size)] text-fg-secondary">
        <span className={overEstimate ? "font-medium text-overdue" : "text-fg"}>
          {formatMinutes(total)}
        </span>{" "}
        registrados
        {estimateMinutes ? ` de ${formatMinutes(estimateMinutes)} estimadas` : ""}
      </p>

      {entries.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => {
            const who = members.find((m) => m.user_id === entry.user_id);
            return (
              <li
                key={entry.id}
                className="group flex items-center gap-2 text-[length:var(--text-caption-size)] text-fg-secondary"
              >
                <span className="tnum font-medium text-fg">
                  {formatMinutes(entry.minutes)}
                </span>
                {entry.source === "pomodoro" ? <span aria-hidden>🍅</span> : null}
                <span>{who?.display_name ?? who?.email ?? "Alguém"}</span>
                {entry.note ? <span className="truncate">— {entry.note}</span> : null}
                <button
                  type="button"
                  aria-label="Remover apontamento"
                  onClick={() => remove.mutate(entry.id)}
                  className="ml-auto opacity-0 transition-opacity hover:text-overdue group-hover:opacity-100"
                >
                  <IconTrash size={13} stroke={1.5} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <div className="w-24">
          <TextInput
            size="sm"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
            placeholder="minutos"
            aria-label="Minutos trabalhados"
          />
        </div>
        <div className="min-w-0 flex-1">
          <TextInput
            size="sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            aria-label="Nota do apontamento"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" leadingIcon={IconPlus}>
          Registrar
        </Button>
      </form>
    </div>
  );
}
