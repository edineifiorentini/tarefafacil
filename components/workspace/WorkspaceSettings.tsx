"use client";

import { IconCopy, IconDownload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  useCurrentUserId,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/lib/queries/useMembers";
import {
  useCreateInvite,
  useInvites,
  useRevokeInvite,
} from "@/lib/queries/useInvites";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { MemberRole } from "@/types/database";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  viewer: "Leitor",
};

const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Membro" },
  { value: "viewer", label: "Leitor" },
];

export function WorkspaceSettings() {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: invites = [] } = useInvites(workspace.id);
  const updateRole = useUpdateMemberRole(workspace.id);
  const removeMember = useRemoveMember(workspace.id);
  const createInvite = useCreateInvite(workspace.id);
  const revokeInvite = useRevokeInvite(workspace.id);

  const [name, setName] = useState(workspace.name);
  const [inviteRole, setInviteRole] = useState<string>("member");

  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManage = myRole === "owner" || myRole === "admin";
  const seatLimit = workspace.seat_limit;
  const seatsFull = members.length >= seatLimit;

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("workspace")
      .update({ name: trimmed })
      .eq("id", workspace.id);
    toast.show({
      message: error ? "Não foi possível renomear" : "Workspace renomeado",
    });
  }

  function inviteLink(token: string) {
    return `${window.location.origin}/convite/${token}`;
  }

  async function generateInvite() {
    const invite = await createInvite.mutateAsync(
      inviteRole as "admin" | "member" | "viewer"
    );
    await navigator.clipboard
      .writeText(inviteLink(invite.token))
      .catch(() => undefined);
    toast.show({ message: "Link de convite copiado" });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
          Workspace
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-64">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              aria-label="Nome do workspace"
              disabled={!canManage}
            />
          </div>
          {canManage ? (
            <Button variant="secondary" size="sm" onClick={saveName}>
              Salvar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
          Membros{" "}
          <span className="tnum text-fg-muted">
            ({members.length}/{seatLimit})
          </span>
        </h2>
        <ul className="flex flex-col gap-1">
          {members.map((m) => {
            const isSelf = m.user_id === myId;
            const isOwner = m.role === "owner";
            return (
              <li
                key={m.user_id}
                className="flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2"
              >
                <Avatar
                  name={m.display_name ?? m.email}
                  src={m.avatar_url ?? undefined}
                  size="sm"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[length:var(--text-small-size)] text-fg">
                    {m.display_name ?? m.email}
                    {isSelf ? " (você)" : ""}
                  </span>
                  <span className="truncate text-[length:var(--text-caption-size)] text-fg-muted">
                    {m.email}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {canManage && !isOwner && !isSelf ? (
                    <div className="w-32">
                      <Select
                        options={ASSIGNABLE_ROLES}
                        value={m.role}
                        onValueChange={(v) =>
                          updateRole.mutate({
                            userId: m.user_id,
                            role: v as MemberRole,
                          })
                        }
                        aria-label={`Papel de ${m.display_name ?? m.email}`}
                      />
                    </div>
                  ) : (
                    <Badge variant="neutral">{ROLE_LABELS[m.role]}</Badge>
                  )}
                  {canManage && !isOwner && !isSelf ? (
                    <button
                      type="button"
                      onClick={() => removeMember.mutate(m.user_id)}
                      aria-label={`Remover ${m.display_name ?? m.email}`}
                      className="rounded-sm p-1 text-fg-muted hover:text-fg"
                    >
                      <IconTrash size={16} stroke={1.5} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {canManage ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
            Convidar
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-32">
              <Select
                options={ASSIGNABLE_ROLES}
                value={inviteRole}
                onValueChange={setInviteRole}
                aria-label="Papel do convite"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              isLoading={createInvite.isPending}
              disabled={seatsFull}
              onClick={generateInvite}
            >
              Gerar link de convite
            </Button>
          </div>

          {seatsFull ? (
            <p className="text-[length:var(--text-caption-size)] text-fg-muted">
              Equipe cheia ({seatLimit} assentos). Remova um membro ou aumente o
              plano para convidar mais.
            </p>
          ) : null}

          {invites.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-2 rounded-md border border-line bg-card px-3 py-2 text-[length:var(--text-small-size)]"
                >
                  <Badge variant="neutral">{ROLE_LABELS[inv.role]}</Badge>
                  <code className="min-w-0 flex-1 truncate text-fg-secondary">
                    {inviteLink(inv.token)}
                  </code>
                  <button
                    type="button"
                    aria-label="Copiar link"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(inviteLink(inv.token))
                        .then(() =>
                          toast.show({ message: "Link copiado" })
                        )
                    }
                    className="rounded-sm p-1 text-fg-muted hover:text-fg"
                  >
                    <IconCopy size={16} stroke={1.5} />
                  </button>
                  <button
                    type="button"
                    aria-label="Revogar convite"
                    onClick={() => revokeInvite.mutate(inv.id)}
                    className="rounded-sm p-1 text-fg-muted hover:text-fg"
                  >
                    <IconTrash size={16} stroke={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
          Dados
        </h2>
        <a
          href="/api/export"
          className="inline-flex h-8 w-fit items-center gap-2 rounded-sm border border-line bg-card px-3 text-[length:var(--text-small-size)] text-fg hover:bg-sunken"
        >
          <IconDownload size={16} stroke={1.5} />
          Exportar tudo em JSON
        </a>
      </div>
    </section>
  );
}
