"use client";

import { IconBell, IconCheck, IconX } from "@tabler/icons-react";
import { Popover } from "radix-ui";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useApproveMember,
  useCurrentUserId,
  useMembers,
  useRemoveMember,
} from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Membro",
  viewer: "Leitor",
  owner: "Dono",
};

// Sino de pedidos de entrada (só dono/admin). Contador + aceitar/recusar.
export function NotificationBell() {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const approve = useApproveMember(workspace.id);
  const remove = useRemoveMember(workspace.id);

  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const pending = members.filter((m) => m.status === "pending");

  if (!canManage) return null;

  const count = pending.length;

  function accept(userId: string, name: string) {
    approve.mutate(userId, {
      onSuccess: () => toast.show({ message: `${name} entrou no workspace` }),
      onError: () => toast.show({ message: "Não foi possível aceitar" }),
    });
  }

  function decline(userId: string, name: string) {
    remove.mutate(userId, {
      onSuccess: () => toast.show({ message: `Pedido de ${name} recusado` }),
      onError: () => toast.show({ message: "Não foi possível recusar" }),
    });
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={
            count > 0
              ? `${count} pedido${count > 1 ? "s" : ""} de entrada`
              : "Notificações"
          }
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
        >
          <IconBell size={20} stroke={1.5} />
          {count > 0 ? (
            <span
              aria-hidden
              className="tnum absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-600)] px-1 text-[length:var(--text-caption-size)] font-medium text-[var(--button-primary-fg)]"
            >
              {count}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 flex w-80 flex-col gap-2 rounded-md border border-line bg-card p-3 shadow-[var(--shadow-panel)] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
        >
          <p className="px-1 text-[length:var(--text-caption-size)] font-medium uppercase tracking-wide text-fg-muted">
            Pedidos de entrada
          </p>

          {count === 0 ? (
            <p className="px-1 py-3 text-[length:var(--text-small-size)] text-fg-secondary">
              Nenhum pedido pendente
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {pending.map((m) => {
                const name = m.display_name ?? m.email;
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-sm px-1 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[length:var(--text-small-size)] font-medium text-fg">
                        {name}
                      </p>
                      <p className="truncate text-[length:var(--text-caption-size)] text-fg-muted">
                        {m.email} · {ROLE_LABEL[m.role] ?? m.role}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      leadingIcon={IconCheck}
                      onClick={() => accept(m.user_id, name)}
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Recusar ${name}`}
                      onClick={() => decline(m.user_id, name)}
                    >
                      <IconX size={16} stroke={1.5} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
