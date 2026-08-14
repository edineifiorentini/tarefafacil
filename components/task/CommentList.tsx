"use client";

import { IconAt, IconSend } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAddComment, useTaskComments } from "@/lib/queries/useTaskComments";
import { useMembers, type Member } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const menuContent =
  "z-50 min-w-44 max-h-64 overflow-auto rounded-md tf-glass-strong p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]";
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-hover";

// Comentários com @menções explícitas (escolhidas num menu, não parseadas do
// texto — mais previsível). Distinto de InsightLog (log de decisões/ADR-008).
export function CommentList({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: comments = [] } = useTaskComments(taskId);
  const { data: members = [] } = useMembers(workspace.id);
  const add = useAddComment(workspace.id, taskId);
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<string[]>([]);

  function mention(m: Member) {
    const name = m.display_name ?? m.email;
    setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${name} `);
    setMentioned((ids) =>
      ids.includes(m.user_id) ? ids : [...ids, m.user_id]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    add.mutate(
      { body: trimmed, mentionedUserIds: mentioned },
      {
        onSuccess: () => {
          setBody("");
          setMentioned([]);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 ? (
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Nenhum comentário ainda
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => {
            const author = members.find((m) => m.user_id === c.author_id);
            const name = author?.display_name ?? author?.email ?? "Alguém";
            return (
              <li key={c.id} className="flex gap-2">
                <Avatar
                  name={name}
                  src={author?.avatar_url ?? undefined}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-fg text-[length:var(--text-small-size)] font-medium">
                      {name}
                    </span>
                    <span className="text-fg-muted text-[length:var(--text-caption-size)]">
                      {formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-fg-secondary text-[length:var(--text-small-size)] whitespace-pre-wrap">
                    {c.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2">
        <Textarea
          autogrow
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva um comentário…"
          aria-label="Novo comentário"
        />
        <div className="flex items-center justify-between">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)]"
              >
                <IconAt size={14} stroke={1.5} />
                Mencionar
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={4}
                className={menuContent}
              >
                {members.length === 0 ? (
                  <div className="text-fg-muted px-2 py-1.5 text-[length:var(--text-small-size)]">
                    Ninguém para mencionar
                  </div>
                ) : (
                  members.map((m) => (
                    <DropdownMenu.Item
                      key={m.user_id}
                      onSelect={() => mention(m)}
                      className={menuItem}
                    >
                      {m.display_name ?? m.email}
                    </DropdownMenu.Item>
                  ))
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <Button
            type="submit"
            size="sm"
            variant="primary"
            leadingIcon={IconSend}
            disabled={!body.trim()}
            isLoading={add.isPending}
          >
            Comentar
          </Button>
        </div>
      </form>
    </div>
  );
}
