"use client";

import {
  IconArrowBackUp,
  IconClipboardPlus,
  IconMessage2,
} from "@tabler/icons-react";
import { parseISO } from "date-fns";
import { useEffect, useRef } from "react";

import { useShell } from "@/components/shell/shell-context";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  channelName: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onReply: (messageId: string) => void;
}) {
  const workspace = useWorkspace();
  const { data: members = [] } = useMembers(workspace.id);
  const { openPanel } = useShell();
  const fim = useRef<HTMLDivElement>(null);

  const nomePorId = new Map(
    members.map((m) => [m.user_id, m.display_name ?? m.email])
  );
  const porId = new Map(messages.map((m) => [m.id, m]));
  const grupos = groupByDay(messages);
  const ultima = messages[0]?.id;

  // Conversa se lê de baixo para cima: chegou mensagem, desce. Carregar
  // páginas antigas não mexe na âncora — `ultima` é a mensagem mais recente.
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
      {hasMore ? (
        <div className="flex justify-center pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            isLoading={isLoadingMore}
          >
            Carregar mensagens anteriores
          </Button>
        </div>
      ) : null}

      {grupos.map((grupo) => (
        <section key={grupo.dayLabel} className="mb-2">
          <div className="sticky top-0 z-10 flex justify-center py-2">
            <span className="tf-glass text-fg-secondary rounded-full px-3 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap">
              {grupo.dayLabel}
            </span>
          </div>

          {grupo.messages.map((msg, i) => {
            const anterior = grupo.messages[i - 1];
            const seguida = isContinuation(msg, anterior) && !msg.reply_to_id;

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
            const citada = msg.reply_to_id
              ? porId.get(msg.reply_to_id)
              : undefined;

            return (
              <article
                key={msg.id}
                className={`group hover:bg-hover relative flex gap-2.5 rounded-sm px-2 transition-colors [transition-duration:var(--dur-fast)] ${
                  seguida ? "py-0.5" : "pt-2 pb-0.5"
                }`}
              >
                <div className="w-8 shrink-0">
                  {seguida ? null : <Avatar name={nome} />}
                </div>
                <div className="min-w-0 flex-1">
                  {msg.reply_to_id ? (
                    <div className="border-line text-fg-muted mb-0.5 truncate border-l-2 pl-2 text-[length:var(--text-caption-size)]">
                      {citada ? (
                        <>
                          <span className="font-medium">
                            {citada.author_id
                              ? (nomePorId.get(citada.author_id) ?? "Alguém")
                              : "Aviso"}
                          </span>
                          {": "}
                          {citada.body}
                        </>
                      ) : (
                        // A citada pode ter sido apagada ou estar numa página
                        // ainda não carregada — as duas dizem a mesma coisa
                        // para quem lê: não dá para mostrar agora.
                        "Mensagem indisponível"
                      )}
                    </div>
                  ) : null}

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

                <button
                  type="button"
                  aria-label={`Responder ${nome}`}
                  onClick={() => onReply(msg.id)}
                  className="text-fg-secondary hover:bg-sunken hover:text-fg absolute top-1 right-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xs opacity-0 transition-opacity [transition-duration:var(--dur-fast)] group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <IconArrowBackUp size={15} stroke={1.75} />
                </button>
              </article>
            );
          })}
        </section>
      ))}
      <div ref={fim} />
    </div>
  );
}
