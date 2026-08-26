"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * Avatar do responsável de uma tarefa.
 *
 * Sem responsável, `mostrarVazio` faz aparecer "Sem responsável" em vez de
 * nada. Numa lista de prioridades isso importa: espaço em branco é ambíguo —
 * pode ser tarefa sem dono ou avatar que não carregou —, e tarefa que ninguém
 * pegou é justamente a que precisa de alguém.
 */
export function AssigneeAvatar({
  assigneeId,
  mostrarVazio = false,
}: {
  assigneeId: string | null;
  mostrarVazio?: boolean;
}) {
  const workspace = useWorkspace();
  const { data: members = [] } = useMembers(workspace.id);

  if (!assigneeId) {
    return mostrarVazio ? (
      <span className="text-fg-muted shrink-0 text-[length:var(--text-caption-size)]">
        Sem responsável
      </span>
    ) : null;
  }
  const member = members.find((m) => m.user_id === assigneeId);
  if (!member) return null;

  return (
    <Avatar
      name={member.display_name ?? member.email}
      src={member.avatar_url ?? undefined}
      size="sm"
    />
  );
}
