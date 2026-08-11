"use client";

import { IconCheck, IconSelector } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";

import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Workspace } from "@/types/database";

export function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: Workspace[];
}) {
  const router = useRouter();
  const active = useWorkspace();

  async function select(id: string) {
    if (id === active.id) return;
    await fetch("/api/workspace/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    router.refresh();
  }

  if (workspaces.length <= 1) {
    return (
      <span className="truncate text-[length:var(--text-h3-size)] font-medium text-fg">
        {active.name}
      </span>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken"
        >
          <span className="min-w-0 flex-1 truncate text-[length:var(--text-h3-size)] font-medium text-fg">
            {active.name}
          </span>
          <IconSelector size={16} stroke={1.5} className="shrink-0 text-fg-muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-56 overflow-hidden rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)] data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
        >
          {workspaces.map((w) => (
            <DropdownMenu.Item
              key={w.id}
              onSelect={() => void select(w.id)}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {w.id === active.id ? <IconCheck size={14} stroke={2} /> : null}
              </span>
              <span className="truncate">{w.name}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
