"use client";

import { IconCheck, IconUsersGroup } from "@tabler/icons-react";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { useCreateGroupChannel } from "@/lib/queries/useChat";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";

/**
 * Criar grupo: nome e quem entra. Quem cria já entra — um grupo sem o
 * criador seria uma sala que ele não vê.
 */
export function NewGroupDialog({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channelId: string) => void;
}) {
  const toast = useToast();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspaceId);
  const create = useCreateGroupChannel(workspaceId);

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const convidaveis = members.filter(
    (m) => m.user_id !== myId && m.status === "active"
  );

  function toggle(userId: string) {
    setSelected((ids) =>
      ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nome = name.trim();
    if (!nome || create.isPending) return;
    create.mutate(
      { name: nome, memberIds: selected },
      {
        onSuccess: (id) => {
          setName("");
          setSelected([]);
          onOpenChange(false);
          onCreated(id);
        },
        onError: () =>
          toast.show({ message: "Não foi possível criar o grupo" }),
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
              Novo grupo
            </Dialog.Title>
          </div>
          <Dialog.Description className="sr-only">
            Escolha um nome e quem participa do grupo
          </Dialog.Description>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Nome do grupo
              </span>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Campanha de vacinação"
                autoFocus
              />
            </label>

            <div className="flex flex-col gap-1">
              <p className="text-fg-secondary text-[length:var(--text-caption-size)] font-medium tracking-wide whitespace-nowrap uppercase">
                Quem participa
              </p>
              {convidaveis.length === 0 ? (
                <p className="text-fg-muted py-2 text-[length:var(--text-small-size)]">
                  Ninguém mais no workspace ainda. Você pode criar o grupo e
                  adicionar depois.
                </p>
              ) : (
                <ul className="max-h-56 overflow-y-auto">
                  {convidaveis.map((m) => {
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
                            {marcado ? <IconCheck size={12} stroke={3} /> : null}
                          </span>
                          <span className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                            {nome}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" type="button">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!name.trim()}
                isLoading={create.isPending}
              >
                Criar grupo
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
