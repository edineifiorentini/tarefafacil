"use client";

import {
  IconAlertTriangle,
  IconMessagePlus,
  IconMessages,
  IconSpeakerphone,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  deadlinesLabel,
  filterBySector,
  sectorDeadlines,
  sectorsInUse,
  sortChannelViews,
  toChannelViews,
} from "@/lib/chat/channels";
import { badgeLabel, totalUnread, unreadByChannel } from "@/lib/chat/unread";
import {
  useChannelMembers,
  useChatChannels,
  useChatMessages,
  useChatReadState,
  useMarkChannelRead,
  useOpenDirectChannel,
  useRecentMessages,
} from "@/lib/queries/useChat";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sortSectorIdsByName } from "@/lib/sectors/options";

import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";
import { NewGroupDialog } from "./NewGroupDialog";

const menuContent =
  "z-50 max-h-64 min-w-48 overflow-auto rounded-md tf-glass-strong p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]";
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-hover";

/**
 * Chat da equipe.
 *
 * Três lugares: "Geral" (todo o workspace), grupos (você escolhe quem entra)
 * e conversas diretas. Setor NÃO é um canal — é etiqueta da mensagem, com
 * filtro no topo. Doze salas de setor partiam a conversa em pedaços que
 * ninguém acompanhava; uma sala com etiqueta mantém o assunto localizável
 * sem espalhar a equipe.
 */
export function ChatView({ initialChannelId }: { initialChannelId?: string }) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: channels = [], isLoading } = useChatChannels(workspace.id);
  const { data: channelMembers = [] } = useChannelMembers(workspace.id);
  const { data: readState = [] } = useChatReadState(workspace.id);
  const { data: tasks = [] } = useTasks(workspace.id);

  const [channelId, setChannelId] = useState<string | null>(
    initialChannelId ?? null
  );
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);

  const membersByChannel = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const row of channelMembers) {
      m.set(row.channel_id, [...(m.get(row.channel_id) ?? []), row.user_id]);
    }
    return m;
  }, [channelMembers]);

  const nameOf = useMemo(() => {
    const nomes = new Map(
      members.map((m) => [m.user_id, m.display_name ?? m.email])
    );
    return (id: string) => nomes.get(id) ?? "Alguém";
  }, [members]);

  const views = useMemo(
    () =>
      sortChannelViews(
        toChannelViews(channels, membersByChannel, myId ?? null, nameOf)
      ),
    [channels, membersByChannel, myId, nameOf]
  );

  const active = channelId ?? views[0]?.channel.id ?? null;
  const atual = views.find((v) => v.channel.id === active);

  const { data: recent = [] } = useRecentMessages(workspace.id, true);
  const query = useChatMessages(active, true);
  const markRead = useMarkChannelRead(workspace.id);
  const openDirect = useOpenDirectChannel(workspace.id);

  const messages = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const visiveis = useMemo(
    () => filterBySector(messages, sectorFilter),
    [messages, sectorFilter]
  );

  const nomeSetor = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.name])),
    [sectors]
  );
  // Só oferece filtro do que realmente aparece na conversa — uma lista com
  // doze setores dos quais ninguém falou é ruído. Em ordem alfabética, que é
  // como se procura um nome.
  const filtros = useMemo(
    () => sortSectorIdsByName(sectorsInUse(messages), nomeSetor),
    [messages, nomeSetor]
  );

  const unread = useMemo(
    () => unreadByChannel(recent, readState, myId ?? null),
    [recent, readState, myId]
  );

  // Relógio lido uma vez: o resumo não pode mudar no meio de um render.
  const [now] = useState(() => new Date());
  const resumo = sectorFilter
    ? deadlinesLabel(sectorDeadlines(tasks, sectorFilter, now))
    : null;

  // Trocar de canal zera resposta e filtro — os dois pertencem à conversa
  // que estava aberta. É consequência do clique, não sincronização com
  // sistema externo, então mora aqui e não num efeito.
  function selecionarCanal(id: string) {
    setChannelId(id);
    setReplyTo(null);
    setSectorFilter(null);
  }

  const ultima = messages[0]?.created_at;
  useEffect(() => {
    if (!active) return;
    markRead.mutate(active);
    // markRead muda de identidade a cada render; incluí-lo remarcaria em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ultima]);

  // Quem já tem conversa direta não aparece de novo no menu.
  const jaTemConversa = new Set(
    views
      .filter((v) => v.channel.kind === "direta")
      .map((v) => v.otherUserId)
      .filter(Boolean) as string[]
  );
  const disponiveis = members.filter(
    (m) =>
      m.user_id !== myId &&
      m.status === "active" &&
      !jaTemConversa.has(m.user_id)
  );

  function conversarCom(userId: string) {
    openDirect.mutate(userId, {
      onSuccess: (id) => selecionarCanal(id),
      onError: () =>
        toast.show({ message: "Não foi possível abrir a conversa" }),
    });
  }

  if (isLoading) {
    return (
      <div className="text-fg-secondary p-6 text-[length:var(--text-small-size)]">
        Carregando…
      </div>
    );
  }

  if (views.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={IconMessages}
          title="Chat indisponível"
          description="O canal geral do workspace não foi encontrado. Recarregue a página"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <nav
        aria-label="Conversas"
        className="border-line hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r p-3 md:flex"
      >
        <div className="flex items-center gap-1 px-2 pb-1">
          <p className="text-fg-muted flex-1 text-[length:var(--text-caption-size)] font-medium tracking-wide whitespace-nowrap uppercase">
            Conversas
          </p>
          <button
            type="button"
            aria-label="Novo grupo"
            onClick={() => setGroupOpen(true)}
            className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs transition-colors [transition-duration:var(--dur-fast)]"
          >
            <IconUsersGroup size={16} stroke={1.75} />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Nova conversa direta"
                className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs transition-colors [transition-duration:var(--dur-fast)]"
              >
                <IconMessagePlus size={16} stroke={1.75} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className={menuContent}
              >
                {disponiveis.length === 0 ? (
                  <div className="text-fg-muted px-2 py-1.5 text-[length:var(--text-small-size)]">
                    Ninguém novo para conversar
                  </div>
                ) : (
                  disponiveis.map((m) => (
                    <DropdownMenu.Item
                      key={m.user_id}
                      onSelect={() => conversarCom(m.user_id)}
                      className={menuItem}
                    >
                      <IconUser size={14} stroke={1.75} aria-hidden />
                      <span className="truncate">
                        {m.display_name ?? m.email}
                      </span>
                    </DropdownMenu.Item>
                  ))
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {views.map((v) => {
          const u = unread.get(v.channel.id);
          const selecionado = v.channel.id === active;
          const Icon =
            v.channel.kind === "geral"
              ? IconSpeakerphone
              : v.channel.kind === "grupo"
                ? IconUsersGroup
                : IconUser;
          return (
            <button
              key={v.channel.id}
              type="button"
              onClick={() => selecionarCanal(v.channel.id)}
              aria-current={selecionado ? "true" : undefined}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors [transition-duration:var(--dur-fast)] ${
                selecionado
                  ? "tf-liquid text-fg font-medium"
                  : "text-fg-secondary hover:bg-hover hover:text-fg"
              }`}
            >
              <Icon size={16} stroke={1.75} aria-hidden className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                {v.label}
              </span>
              {u && !selecionado ? (
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
        <div className="border-line flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <label htmlFor="canal" className="sr-only">
            Conversa
          </label>
          <select
            id="canal"
            value={active ?? ""}
            onChange={(e) => selecionarCanal(e.target.value)}
            className="bg-card text-fg border-line h-9 w-full rounded-sm border px-2 text-[length:var(--text-small-size)]"
          >
            {views.map((v) => {
              const u = unread.get(v.channel.id);
              return (
                <option key={v.channel.id} value={v.channel.id}>
                  {v.label}
                  {u ? ` (${badgeLabel(u.count)})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {filtros.length > 0 ? (
          <div className="border-line flex flex-wrap items-center gap-1.5 border-b px-4 py-2">
            <span className="text-fg-muted text-[length:var(--text-caption-size)] whitespace-nowrap">
              Assunto:
            </span>
            <FiltroChip
              label="Tudo"
              active={sectorFilter === null}
              onClick={() => setSectorFilter(null)}
            />
            {filtros.map((id) => (
              <FiltroChip
                key={id}
                label={nomeSetor.get(id) ?? "Setor"}
                active={sectorFilter === id}
                onClick={() => setSectorFilter(id)}
              />
            ))}
          </div>
        ) : null}

        {/* Resumo do SETOR filtrado, agregado. O sino cuida do pessoal e por
            demanda — por isso os dois convivem sem repetir a informação. */}
        {resumo ? (
          <div className="border-line text-fg-secondary flex items-center gap-2 border-b px-4 py-2 text-[length:var(--text-caption-size)]">
            <IconAlertTriangle
              size={14}
              stroke={1.75}
              aria-hidden
              className="shrink-0 text-[var(--color-overdue)]"
            />
            <span className="truncate">
              Prazos de {nomeSetor.get(sectorFilter as string)}: {resumo}
            </span>
          </div>
        ) : null}

        <MessageList
          messages={visiveis}
          isLoading={query.isLoading}
          channelName={atual?.label ?? ""}
          sectorNames={nomeSetor}
          filtered={sectorFilter !== null}
          hasMore={!!query.hasNextPage}
          isLoadingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          onReply={setReplyTo}
        />

        {active ? (
          <MessageComposer
            workspaceId={workspace.id}
            channelId={active}
            channelName={atual?.label ?? ""}
            replyTo={messages.find((m) => m.id === replyTo) ?? null}
            onCancelReply={() => setReplyTo(null)}
          />
        ) : null}
      </div>

      <NewGroupDialog
        workspaceId={workspace.id}
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={selecionarCanal}
      />
    </div>
  );
}

function FiltroChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] ${
        active
          ? "bg-[var(--brand-600)] font-medium text-[var(--button-primary-fg)]"
          : "bg-sunken text-fg-secondary hover:text-fg"
      }`}
    >
      {label}
    </button>
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
