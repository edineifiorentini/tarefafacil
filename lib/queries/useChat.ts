"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type {
  ChatChannel,
  ChatChannelMember,
  ChatMessage,
  ChatReadState,
} from "@/types/database";

/**
 * Sem Realtime na rodada 1.
 *
 * Websocket do Supabase é conexão aberta por aba e entra na conta; para uma
 * equipe pequena, buscar de tempos em tempos ENQUANTO o chat está aberto
 * resolve com custo previsível. Se o uso mostrar que 6s é lento demais ou
 * caro demais, aí sim vale trocar — com número na mão, não por suposição.
 */
const POLL_MS = 6_000;

/** Quantas mensagens a conversa carrega de uma vez. */
const PAGE = 50;
/**
 * Janela usada só para o contador de não lidas do menu lateral. É um teto
 * de segurança, não uma paginação: passar disso significaria que o chat
 * precisa de contagem no banco, não no cliente.
 */
const UNREAD_WINDOW = 300;

function channelsKey(workspaceId: string) {
  return ["chatChannels", workspaceId] as const;
}
function messagesKey(channelId: string) {
  return ["chatMessages", channelId] as const;
}
function recentKey(workspaceId: string) {
  return ["chatRecent", workspaceId] as const;
}
function membersKey(workspaceId: string) {
  return ["chatChannelMembers", workspaceId] as const;
}
function readStateKey(workspaceId: string) {
  return ["chatReadState", workspaceId] as const;
}

/**
 * Canais visíveis. A RLS já esconde conversa direta de quem não participa —
 * a consulta não filtra nada além do workspace de propósito, para não dar a
 * impressão de que a privacidade mora no cliente.
 *
 * A ordem e o rótulo saem de `lib/chat/channels.ts`: conversa direta se
 * chama pela outra pessoa, e isso o hook não tem como saber sozinho.
 */
export function useChatChannels(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: channelsKey(workspaceId),
    queryFn: async (): Promise<ChatChannel[]> => {
      const { data, error } = await supabase
        .from("chat_channel")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Participantes das conversas diretas que eu enxergo. */
export function useChannelMembers(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: membersKey(workspaceId),
    queryFn: async (): Promise<ChatChannelMember[]> => {
      const { data, error } = await supabase
        .from("chat_channel_member")
        .select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Abre a conversa direta com alguém — ou devolve a que já existe.
 *
 * É RPC porque criar o canal exige inserir participante para DUAS pessoas, e
 * a policy de escrita de canal é só de owner/admin. A função no banco
 * confere que ambos são membros ativos antes de criar.
 */
export function useOpenDirectChannel(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc("open_direct_channel", {
        ws: workspaceId,
        other: otherUserId,
      });
      if (error) throw error;
      return data as string;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: channelsKey(workspaceId) });
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) });
    },
  });
}

/**
 * Conversa paginada para trás.
 *
 * O cursor é o `created_at` da mensagem mais antiga já carregada, não um
 * offset: com mensagem nova chegando o tempo todo, offset repetiria e
 * puliria linhas a cada página.
 */
export function useChatMessages(channelId: string | null, active: boolean) {
  const supabase = createClient();
  return useInfiniteQuery({
    enabled: !!channelId,
    queryKey: messagesKey(channelId ?? "nenhum"),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<ChatMessage[]> => {
      let q = supabase
        .from("chat_message")
        .select("*")
        .eq("channel_id", channelId as string)
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (pageParam) q = q.lt("created_at", pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (ultima) =>
      ultima.length < PAGE ? undefined : ultima[ultima.length - 1].created_at,
    // Só a primeira página é revalidada pelo intervalo; as antigas não mudam.
    refetchInterval: active ? POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** Mensagens recentes de todos os canais — alimenta só o contador lateral. */
export function useRecentMessages(workspaceId: string, active: boolean) {
  const supabase = createClient();
  return useQuery({
    queryKey: recentKey(workspaceId),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_message")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(UNREAD_WINDOW);
      if (error) throw error;
      return data;
    },
    refetchInterval: active ? POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: POLL_MS,
  });
}

export function useChatReadState(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: readStateKey(workspaceId),
    queryFn: async (): Promise<ChatReadState[]> => {
      // A RLS já limita às minhas linhas.
      const { data, error } = await supabase.from("chat_read_state").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMessage(workspaceId: string, channelId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
      mentionedUserIds,
      replyToId,
    }: {
      body: string;
      mentionedUserIds: string[];
      replyToId?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("chat_message").insert({
        workspace_id: workspaceId,
        channel_id: channelId,
        author_id: user?.id ?? null,
        body,
        mentioned_user_ids: mentionedUserIds,
        reply_to_id: replyToId ?? null,
      });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: messagesKey(channelId) });
      qc.invalidateQueries({ queryKey: recentKey(workspaceId) });
    },
  });
}

/**
 * Marca o canal como lido até agora. `upsert` porque a primeira visita não
 * tem linha ainda — e criar antes de ler exigiria um trigger só para isso.
 */
export function useMarkChannelRead(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("chat_read_state").upsert(
        {
          channel_id: channelId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "channel_id,user_id" }
      );
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: readStateKey(workspaceId) }),
  });
}
