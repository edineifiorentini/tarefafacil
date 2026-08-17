"use client";

import { IconClipboardPlus, IconMessage2 } from "@tabler/icons-react";
import { parseISO } from "date-fns";
import { useEffect, useRef } from "react";

import { useShell } from "@/components/shell/shell-context";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupByDay, isContinuation } from "@/lib/chat/unread";
import { useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { ChatMessage } from "@/types/database";

function hora(iso: string): string {
  return parseISO(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageList({
  messages,
  isLoading,
  channelName,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  channelName: string;
}) {
  const workspace = useWorkspace();
  const { data: members = [] } = useMembers(workspace.id);
  const { openPanel } = useShell();
  const fim = useRef<HTMLDivElement>(null);

  const nomePorId = new Map(
    members.map((m) => [m.user_id, m.display_name ?? m.email])
  );
  const grupos = groupByDay(messages);
  const ultima = messages[0]?.id;

  // Conversa se lê de baixo para cima: chegou mensagem, desce.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [ultima]);

  if (isLoading) {
    return (
      <div className="text-fg-secondary flex-1 p-6 text-[length:var(--text-small-size)]">
        Carregando…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={IconMessage2}
          title={`Nada em ${channelName} ainda`}
          description="Escreva a primeira mensagem. Demandas criadas neste setor também aparecem aqui"
        />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {grupos.map((grupo) => (
        <section key={grupo.dayLabel} className="mb-2">
          <div className="sticky top-0 z-10 flex justify-center py-2">
            <span className="tf-glass text-fg-secondary rounded-full px-3 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap">
              {grupo.dayLabel}
            </span>
          </div>

          {grupo.messages.map((msg, i) => {
            const anterior = grupo.messages[i - 1];
            const seguida = isContinuation(msg, anterior);

            if (msg.kind === "sistema") {
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-center py-1.5"
                >
                  <button
                    type="button"
                    disabled={!msg.entity_id}
                    onClick={() =>
                      msg.entity_id &&
                      openPanel({
                        title: "Tarefa",
                        node: <TaskDetailPanel taskId={msg.entity_id} />,
                      })
                    }
                    className="text-fg-secondary hover:bg-hover inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] disabled:pointer-events-none"
                  >
                    <IconClipboardPlus
                      size={14}
                      stroke={1.75}
                      aria-hidden
                      className="shrink-0"
                    />
                    <span className="truncate">{msg.body}</span>
                  </button>
                </div>
              );
            }

            const nome = msg.author_id
              ? (nomePorId.get(msg.author_id) ?? "Alguém")
              : "Alguém";

            return (
              <article
                key={msg.id}
                className={`hover:bg-hover flex gap-2.5 rounded-sm px-2 transition-colors [transition-duration:var(--dur-fast)] ${
                  seguida ? "py-0.5" : "pt-2 pb-0.5"
                }`}
              >
                <div className="w-8 shrink-0">
                  {seguida ? null : <Avatar name={nome} />}
                </div>
                <div className="min-w-0 flex-1">
                  {seguida ? null : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-fg truncate text-[length:var(--text-small-size)] font-semibold">
                        {nome}
                      </span>
                      <time
                        dateTime={msg.created_at}
                        className="tnum text-fg-muted shrink-0 text-[length:var(--text-caption-size)]"
                      >
                        {hora(msg.created_at)}
                      </time>
                    </div>
                  )}
                  <p className="text-fg text-[length:var(--text-small-size)] wrap-anywhere whitespace-pre-wrap">
                    {msg.body}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      ))}
      <div ref={fim} />
    </div>
  );
}
