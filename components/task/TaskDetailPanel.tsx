"use client";

import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useSyncTaskEvent } from "@/lib/queries/useGcal";
import { useProjects } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import { useTaskDetail, useUpdateTask } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { TablesUpdate } from "@/types/database";

import { AttachmentList } from "./AttachmentList";
import { InsightLog } from "./InsightLog";
import { SubtaskList } from "./SubtaskList";
import { TagSelector } from "./TagSelector";
import { TaskSyncToggle } from "./TaskSyncToggle";

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

type SaveStatus = "idle" | "saving" | "saved";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[length:var(--text-small-size)] text-fg-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

export function TaskDetailPanel({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: task } = useTaskDetail(workspace.id, taskId);
  const { data: sectors = [] } = useSectors(workspace.id);
  const update = useUpdateTask(workspace.id);
  const syncEvent = useSyncTaskEvent();

  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef<TablesUpdate<"task">>({});
  const timer = useRef<number | undefined>(undefined);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [sectorId, setSectorId] = useState(task?.sector_id ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [priority, setPriority] = useState<string>(task?.priority ?? "media");
  const [projectId, setProjectId] = useState<string | null>(
    task?.project_id ?? null
  );
  const { data: projects = [] } = useProjects(workspace.id, sectorId);

  if (!task) {
    return <p className="text-fg-secondary">Carregando…</p>;
  }

  function scheduleSave(patch: TablesUpdate<"task">) {
    pending.current = { ...pending.current, ...patch };
    setStatus("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const p = pending.current;
      pending.current = {};
      update.mutate(
        { id: taskId, patch: p },
        {
          onSuccess: () => {
            setStatus("saved");
            // Reflete a edição no evento do Google, se a tarefa sincroniza.
            if (task?.gcal_sync) void syncEvent(taskId);
          },
          onError: () => setStatus("idle"),
        }
      );
    }, 800);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <TextInput
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          aria-label="Título da tarefa"
          placeholder="Título da tarefa"
          className="text-[length:var(--text-h3-size)]"
        />
        <div className="flex h-4 items-center gap-1 text-[length:var(--text-caption-size)] text-fg-muted">
          {status === "saving" ? (
            <>
              <IconLoader2 size={12} className="animate-spin" aria-hidden />
              Salvando…
            </>
          ) : status === "saved" ? (
            <>
              <IconCheck size={12} aria-hidden />
              Salvo
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Setor">
          <Select
            options={sectors.map((s) => ({ value: s.id, label: s.name }))}
            value={sectorId}
            onValueChange={(v) => {
              setSectorId(v);
              scheduleSave({ sector_id: v });
            }}
            aria-label="Setor"
          />
        </Field>
        <Field label="Prioridade">
          <Select
            options={PRIORITIES}
            value={priority}
            onValueChange={(v) => {
              setPriority(v);
              scheduleSave({ priority: v as "baixa" | "media" | "alta" });
            }}
            aria-label="Prioridade"
          />
        </Field>
      </div>

      <Field label="Projeto">
        <Select
          options={[
            { value: "__none__", label: "Nenhum" },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={projectId ?? "__none__"}
          onValueChange={(v) => {
            const pid = v === "__none__" ? null : v;
            setProjectId(pid);
            scheduleSave({ project_id: pid });
          }}
          aria-label="Projeto"
        />
      </Field>

      <Field label="Prazo">
        <div className="w-44">
          <TextInput
            type="date"
            value={dueDate ?? ""}
            onChange={(e) => {
              setDueDate(e.target.value);
              scheduleSave({ due_date: e.target.value || null });
            }}
            aria-label="Prazo"
          />
        </div>
      </Field>

      <TaskSyncToggle taskId={taskId} />

      <Field label="Tags">
        <TagSelector taskId={taskId} />
      </Field>

      <Field label="Descrição">
        <Textarea
          autogrow
          value={description ?? ""}
          onChange={(e) => {
            setDescription(e.target.value);
            scheduleSave({ description: e.target.value || null });
          }}
          placeholder="Adicione detalhes…"
          aria-label="Descrição"
        />
      </Field>

      <Field label="Subtarefas">
        <SubtaskList taskId={taskId} parentDue={dueDate || null} />
      </Field>

      <Field label="Anexos">
        <AttachmentList taskId={taskId} />
      </Field>

      <Field label="Insights">
        <InsightLog taskId={taskId} />
      </Field>
    </div>
  );
}
