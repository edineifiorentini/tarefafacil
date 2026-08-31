"use client";

import { IconCheck, IconSelector } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";

import { WorkspaceMark } from "@/components/branding/WorkspaceMark";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Workspace } from "@/types/database";

export function WorkspaceSwitcher({ workspaces }: { workspaces: Workspace[] }) {
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
    return <WorkspaceMark name={active.name} logoUrl={active.logo_url} />;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="hover:bg-hover flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left transition-colors [transition-duration:var(--dur-fast)]"
        >
          <WorkspaceMark
            name={active.name}
            logoUrl={active.logo_url}
            className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-h3-size)] font-medium"
          />
          <IconSelector
            size={16}
            stroke={1.5}
            className="text-fg-muted shrink-0"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="tf-glass-strong z-50 min-w-56 overflow-hidden rounded-md p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
        >
          {workspaces.map((w) => (
            <DropdownMenu.Item
              key={w.id}
              onSelect={() => void select(w.id)}
              className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {w.id === active.id ? <IconCheck size={14} stroke={2} /> : null}
              </span>
              {/* `queda="nome"`: aqui a marca serve para diferenciar uma
                  empresa da outra, e a do produto não diferencia nada. */}
              <WorkspaceMark
                name={w.name}
                logoUrl={w.logo_url}
                contexto="menu"
                queda="nome"
                className="min-w-0 truncate"
              />
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
