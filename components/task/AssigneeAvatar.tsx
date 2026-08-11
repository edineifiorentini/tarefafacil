"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

// Avatar do responsável de uma tarefa. Nada quando não há responsável.
export function AssigneeAvatar({ assigneeId }: { assigneeId: string | null }) {
  const workspace = useWorkspace();
  const { data: members = [] } = useMembers(workspace.id);

  if (!assigneeId) return null;
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
