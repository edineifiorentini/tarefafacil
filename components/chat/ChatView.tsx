"use client";

import { IconHash, IconMessages, IconSpeakerphone } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import {
  badgeLabel,
  totalUnread,
  unreadByChannel,
} from "@/lib/chat/unread";
import {
  useChatChannels,
  useChatMessages,
  useChatReadState,
  useMarkChannelRead,
  useRecentMessages,
} from "@/lib/queries/useChat";
import { useCurrentUserId } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";

/**
 * Chat da equipe. Um canal por setor, mais o "Geral" — a mesma taxonomia da
 * barra lateral, para ninguém ter que decidir duas vezes onde um assunto
 * mora.
 */
export function ChatView({ initialChannelId }: { initialChannelId?: string }) {
  const workspace = useWorkspace();
  const { data: myId } = useCurrentUserId();
  const { data: channels = [], isLoading } = useChatChannels(workspace.id);
  const { data: readState = [] } = useChatReadState(workspace.id);

  const [channelId, setChannelId] = useState<string | null>(
    initialChannelId ?? null
  );

  // Sem escolha ainda: abre no Geral, que é o primeiro da lista.
  const active = channelId ?? channels[0]?.id ?? null;

  const { data: recent = [] } = useRecentMessages(workspace.id, true);
  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(
    active,
    true
  );
  const markRead = useMarkChannelRead(workspace.id);

  const unread = useMemo(
    () => unreadByChannel(recent, readState, myId ?? null),
    [recent, readState, myId]
  );

  // Estar com o canal aberto é ter lido. Marca ao entrar e sempre que
  // chegar mensagem nova enquanto a tela está à frente.
  const ultima = messages[0]?.created_at;
  useEffect(() => {
    if (!active) return;
    markRead.mutate(active);
    // markRead muda de identidade a cada render; incluí-lo remarcaria em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ultima]);

  if (isLoading) {
    return (
      <div className="text-fg-secondary p-6 text-[length:var(--text-small-size)]">
        Carregando…
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={IconMessages}
          title="Nenhum canal ainda"
          description="Os canais nascem com os setores. Crie um setor para a equipe ter onde conversar"
        />
      </div>
    );
  }

  const canal = channels.find((c) => c.id === active);

  return (
    <div className="flex h-full min-h-0">
      <nav
        aria-label="Canais"
        className="border-line hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r p-3 md:flex"
      >
        <p className="text-fg-muted px-2 pb-1 text-[length:var(--text-caption-size)] font-medium tracking-wide whitespace-nowrap uppercase">
          Canais
        </p>
        {channels.map((c) => {
          const u = unread.get(c.id);
          const atual = c.id === active;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannelId(c.id)}
              aria-current={atual ? "true" : undefined}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors [transition-duration:var(--dur-fast)] ${
                atual
                  ? "tf-liquid text-fg font-medium"
                  : "text-fg-secondary hover:bg-hover hover:text-fg"
              }`}
            >
              {c.sector_id ? (
                <IconHash size={16} stroke={1.75} aria-hidden className="shrink-0" />
              ) : (
                <IconSpeakerphone
                  size={16}
                  stroke={1.75}
                  aria-hidden
                  className="shrink-0"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                {c.name}
              </span>
              {u && !atual ? (
                <span
                  className={`tnum shrink-0 rounded-full px-1.5 text-[length:var(--text-caption-size)] font-medium ${
                    u.mentionsMe
                      ? "bg-[var(--brand-600)] text-[var(--button-primary-fg)]"
                      : "bg-sunken text-fg-secondary"
                  }`}
                >
                  {badgeLabel(u.count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Seletor de canal em tela estreita, onde a coluna não cabe. */}
        <div className="border-line flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <label htmlFor="canal" className="sr-only">
            Canal
          </label>
          <select
            id="canal"
            value={active ?? ""}
            onChange={(e) => setChannelId(e.target.value)}
            className="bg-card text-fg border-line h-9 w-full rounded-sm border px-2 text-[length:var(--text-small-size)]"
          >
            {channels.map((c) => {
              const u = unread.get(c.id);
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {u ? ` (${badgeLabel(u.count)})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <MessageList
          messages={messages}
          isLoading={loadingMessages}
          channelName={canal?.name ?? ""}
        />

        {active ? (
          <MessageComposer
            workspaceId={workspace.id}
            channelId={active}
            channelName={canal?.name ?? ""}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Total para o menu lateral do app. */
export function useChatUnreadTotal(): number {
  const workspace = useWorkspace();
  const { data: myId } = useCurrentUserId();
  const { data: recent = [] } = useRecentMessages(workspace.id, false);
  const { data: readState = [] } = useChatReadState(workspace.id);
  return totalUnread(unreadByChannel(recent, readState, myId ?? null));
}
