"use client";

import { IconBan, IconPlus, IconX } from "@tabler/icons-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import type { FormEvent } from "react";

import { TextInput } from "@/components/ui/TextInput";
import {
  useAddDependency,
  useBlockedByTasks,
  useRemoveDependency,
} from "@/lib/queries/useTaskDependencies";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

// "Bloqueada por": lista de demandas que precisam terminar antes desta. O
// bloqueio é visual (indicador), não impede concluir — a decisão fica com
// quem está trabalhando.
export function DependencySelector({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: blockedBy = [] } = useBlockedByTasks(taskId);
  const { data: allTasks = [] } = useTasks(workspace.id);
  const add = useAddDependency(workspace.id, taskId);
  const remove = useRemoveDependency(taskId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const blockedIds = new Set(blockedBy.map((t) => t.id));
  const q = query.trim().toLowerCase();
  const candidates = allTasks
    .filter((t) => t.id !== taskId && !blockedIds.has(t.id))
    .filter((t) => !q || t.title.toLowerCase().includes(q))
    .slice(0, 8);

  function pick(id: string, e?: FormEvent) {
    e?.preventDefault();
    add.mutate(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {blockedBy.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {blockedBy.map((t) => {
            const resolved = !!(t.completed_at || t.cancelled_at);
            return (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-[length:var(--text-small-size)]"
              >
                <IconBan
                  size={14}
                  stroke={1.5}
                  className={resolved ? "text-fg-muted" : "text-overdue"}
                />
                <span
                  className={`flex-1 truncate ${resolved ? "text-fg-muted line-through" : "text-fg"}`}
                >
                  {t.title}
                </span>
                <button
                  type="button"
                  aria-label={`Remover bloqueio de ${t.title}`}
                  onClick={() => remove.mutate(t.id)}
                  className="text-fg-muted hover:text-fg"
                >
                  <IconX size={12} stroke={2} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="border-line text-fg-secondary hover:bg-sunken hover:text-fg inline-flex h-7 w-fit items-center gap-1 rounded-full border border-dashed px-2 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)]"
          >
            <IconPlus size={12} stroke={2} />
            Bloquear por outra demanda
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="tf-glass-strong z-50 flex w-72 flex-col gap-2 rounded-md p-2 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
          >
            <TextInput
              size="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar demanda…"
              aria-label="Buscar demanda para bloquear"
              autoFocus
            />
            <ul className="flex max-h-48 flex-col overflow-auto">
              {candidates.length === 0 ? (
                <li className="text-fg-muted px-2 py-1.5 text-[length:var(--text-small-size)]">
                  Nenhuma demanda encontrada
                </li>
              ) : (
                candidates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => pick(t.id)}
                      className="text-fg hover:bg-sunken w-full truncate rounded-sm px-2 py-1.5 text-left text-[length:var(--text-small-size)]"
                    >
                      {t.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
