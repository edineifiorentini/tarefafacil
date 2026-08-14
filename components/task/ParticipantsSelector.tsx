"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { Avatar } from "@/components/ui/Avatar";
import { useMembers } from "@/lib/queries/useMembers";
import {
  useAddParticipant,
  useRemoveParticipant,
  useTaskParticipants,
} from "@/lib/queries/useTaskParticipants";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const menuContent =
  "z-50 min-w-48 max-h-64 overflow-auto rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)] data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]";
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken";

// Participantes além do responsável principal. Ninguém em duplicidade: o
// dropdown só oferece quem ainda não está na lista (e opcionalmente exclui
// o responsável, já mostrado no campo próprio).
export function ParticipantsSelector({
  taskId,
  excludeUserId,
}: {
  taskId: string;
  excludeUserId?: string | null;
}) {
  const workspace = useWorkspace();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: participantIds = [] } = useTaskParticipants(taskId);
  const add = useAddParticipant(workspace.id, taskId);
  const remove = useRemoveParticipant(workspace.id, taskId);

  const participants = members.filter((m) => participantIds.includes(m.user_id));
  const available = members.filter(
    (m) => !participantIds.includes(m.user_id) && m.user_id !== excludeUserId
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {participants.map((m) => {
        const name = m.display_name ?? m.email;
        return (
          <span
            key={m.user_id}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-0.5 pl-1 pr-2 text-[length:var(--text-caption-size)] text-fg"
          >
            <Avatar name={name} src={m.avatar_url ?? undefined} size="sm" />
            {name}
            <button
              type="button"
              aria-label={`Remover ${name}`}
              onClick={() => remove.mutate(m.user_id)}
              className="text-fg-muted hover:text-fg"
            >
              <IconX size={12} stroke={2} />
            </button>
          </span>
        );
      })}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-line px-2 text-[length:var(--text-caption-size)] text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
          >
            <IconPlus size={12} stroke={2} />
            Adicionar
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={4} className={menuContent}>
            {available.length === 0 ? (
              <div className="px-2 py-1.5 text-[length:var(--text-small-size)] text-fg-muted">
                Ninguém mais para adicionar
              </div>
            ) : (
              available.map((m) => (
                <DropdownMenu.Item
                  key={m.user_id}
                  onSelect={() => add.mutate(m.user_id)}
                  className={menuItem}
                >
                  {m.display_name ?? m.email}
                </DropdownMenu.Item>
              ))
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
