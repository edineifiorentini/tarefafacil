"use client";

import {
  IconDotsVertical,
  IconLogout,
  IconPencil,
  IconSpeakerphone,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import {
  useLeaveGroupChannel,
  useRenameGroupChannel,
} from "@/lib/queries/useChat";
import type { ChatChannel } from "@/types/database";

import { GroupMembersDialog } from "./GroupMembersDialog";

const menuContent =
  "z-50 min-w-48 rounded-md tf-glass-strong p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]";
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-hover";

/**
 * Cabeçalho da conversa. Além de dizer onde você está — o nome só aparecia
 * na lista lateral, que some em tela estreita —, é onde moram as ações do
 * grupo, que antes existiam no banco e em lugar nenhum na tela.
 */
export function ChannelHeader({
  workspaceId,
  channel,
  label,
  memberIds,
  myId,
  canAdmin,
  onLeft,
}: {
  workspaceId: string;
  channel: ChatChannel;
  label: string;
  memberIds: string[];
  myId: string | null;
  /** Dono ou admin do workspace — pode renomear grupo que não criou. */
  canAdmin: boolean;
  onLeft: () => void;
}) {
  const toast = useToast();
  const rename = useRenameGroupChannel(workspaceId);
  const leave = useLeaveGroupChannel(workspaceId);

  const [membersOpen, setMembersOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [novoNome, setNovoNome] = useState(channel.name);

  const isGroup = channel.kind === "grupo";
  const podeRenomear = isGroup && (canAdmin || channel.created_by === myId);

  const Icon =
    channel.kind === "geral"
      ? IconSpeakerphone
      : isGroup
        ? IconUsersGroup
        : IconUser;

  function confirmarNome(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome || nome === channel.name) {
      setRenaming(false);
      return;
    }
    rename.mutate(
      { channelId: channel.id, name: nome },
      {
        onSuccess: () => setRenaming(false),
        onError: () => toast.show({ message: "Não foi possível renomear" }),
      }
    );
  }

  function sair() {
    leave.mutate(channel.id, {
      onSuccess: () => {
        toast.show({ message: `Você saiu de ${channel.name}` });
        onLeft();
      },
      onError: () => toast.show({ message: "Não foi possível sair do grupo" }),
    });
  }

  return (
    <div className="border-line flex items-center gap-2 border-b px-4 py-2">
      <Icon
        size={16}
        stroke={1.75}
        aria-hidden
        className="text-fg-secondary shrink-0"
      />

      {renaming ? (
        <form
          onSubmit={confirmarNome}
          className="flex flex-1 items-center gap-2"
        >
          <TextInput
            size="sm"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNovoNome(channel.name);
                setRenaming(false);
              }
            }}
            aria-label="Novo nome do grupo"
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            variant="primary"
            isLoading={rename.isPending}
          >
            Salvar
          </Button>
        </form>
      ) : (
        <>
          <h2 className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)] font-semibold">
            {label}
          </h2>

          {isGroup ? (
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-[length:var(--text-caption-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)]"
            >
              <IconUsersGroup size={14} stroke={1.75} aria-hidden />
              {memberIds.length}
            </button>
          ) : null}

          {isGroup ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Ações de ${label}`}
                  className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)]"
                >
                  <IconDotsVertical size={16} stroke={1.75} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className={menuContent}
                  // Sem isto, o foco volta ao gatilho e o campo de renomear
                  // perde o foco assim que abre.
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenu.Item
                    onSelect={() => setMembersOpen(true)}
                    className={menuItem}
                  >
                    <IconUsersGroup size={14} stroke={1.75} aria-hidden />
                    Participantes
                  </DropdownMenu.Item>
                  {podeRenomear ? (
                    <DropdownMenu.Item
                      onSelect={() => {
                        setNovoNome(channel.name);
                        setRenaming(true);
                      }}
                      className={menuItem}
                    >
                      <IconPencil size={14} stroke={1.75} aria-hidden />
                      Renomear grupo
                    </DropdownMenu.Item>
                  ) : null}
                  <DropdownMenu.Item onSelect={sair} className={menuItem}>
                    <IconLogout size={14} stroke={1.75} aria-hidden />
                    Sair do grupo
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </>
      )}

      {isGroup ? (
        <GroupMembersDialog
          workspaceId={workspaceId}
          channelId={channel.id}
          memberIds={memberIds}
          open={membersOpen}
          onOpenChange={setMembersOpen}
        />
      ) : null}
    </div>
  );
}
