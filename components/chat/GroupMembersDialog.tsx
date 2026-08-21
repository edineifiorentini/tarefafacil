"use client";

import { IconCheck, IconUsersGroup } from "@tabler/icons-react";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddGroupMembers } from "@/lib/queries/useChat";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";

/**
 * Participantes do grupo: quem já está e quem dá para chamar.
 *
 * Só adiciona. Tirar outra pessoa é moderação — decisão que o produto ainda
 * não tomou —, e sair é ação de quem sai, que vive no menu do cabeçalho.
 */
export function GroupMembersDialog({
  workspaceId,
  channelId,
  memberIds,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  channelId: string;
  memberIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspaceId);
  const add = useAddGroupMembers(workspaceId);
  const [selected, setSelected] = useState<string[]>([]);

  const dentro = new Set(memberIds);
  const participantes = members.filter((m) => dentro.has(m.user_id));
  const disponiveis = members.filter(
    (m) => !dentro.has(m.user_id) && m.status === "active"
  );

  function toggle(userId: string) {
    setSelected((ids) =>
      ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0 || add.isPending) return;
    add.mutate(
      { channelId, memberIds: selected },
      {
        onSuccess: () => {
          setSelected([]);
          onOpenChange(false);
        },
        onError: () =>
          toast.show({ message: "Não foi possível adicionar ao grupo" }),
      }
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--graphite-rgb)/0.32)] data-[state=open]:[animation:tf-fade-in_var(--dur-fast)_ease-out]" />
        <Dialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg p-5 data-[state=open]:[animation:tf-pop-in_var(--dur-base)_var(--ease-out)]">
          <div className="flex items-center gap-2">
            <IconUsersGroup size={18} stroke={1.75} aria-hidden />
            <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
              Participantes
            </Dialog.Title>
          </div>
          <Dialog.Description className="sr-only">
            Veja quem participa do grupo e adicione outras pessoas
          </Dialog.Description>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide whitespace-nowrap uppercase">
                No grupo ({participantes.length})
              </p>
              <ul className="max-h-40 overflow-y-auto">
                {participantes.map((m) => {
                  const nome = m.display_name ?? m.email;
                  return (
                    <li
                      key={m.user_id}
                      className="flex items-center gap-2 px-2 py-1.5"
                    >
                      <Avatar name={nome} src={m.avatar_url ?? undefined} />
                      <span className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                        {nome}
                        {m.user_id === myId ? (
                          <span className="text-fg-muted"> (você)</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {disponiveis.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide whitespace-nowrap uppercase">
                  Adicionar
                </p>
                <ul className="max-h-44 overflow-y-auto">
                  {disponiveis.map((m) => {
                    const nome = m.display_name ?? m.email;
                    const marcado = selected.includes(m.user_id);
                    return (
                      <li key={m.user_id}>
                        <button
                          type="button"
                          onClick={() => toggle(m.user_id)}
                          aria-pressed={marcado}
                          className="hover:bg-hover flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors [transition-duration:var(--dur-fast)]"
                        >
                          <span
                            aria-hidden
                            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
                              marcado
                                ? "border-transparent bg-[var(--brand-600)] text-[var(--button-primary-fg)]"
                                : "border-line"
                            }`}
                          >
                            {marcado ? (
                              <IconCheck size={12} stroke={3} />
                            ) : null}
                          </span>
                          <span className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                            {nome}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-fg-muted text-[length:var(--text-small-size)]">
                Todo mundo do workspace já está neste grupo.
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" type="button">
                  Fechar
                </Button>
              </Dialog.Close>
              {disponiveis.length > 0 ? (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={selected.length === 0}
                  isLoading={add.isPending}
                >
                  Adicionar
                </Button>
              ) : null}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
