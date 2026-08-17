"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { ChatChannel, ChatMessage, ChatReadState } from "@/types/database";

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
function readStateKey(workspaceId: string) {
  return ["chatReadState", workspaceId] as const;
}

/** Canais do workspace. "Geral" primeiro, setores depois em ordem alfabética. */
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
      return [...data].sort((a, b) => {
        if (!a.sector_id) return -1;
        if (!b.sector_id) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    },
    staleTime: 5 * 60_000,
  });
}

export function useChatMessages(channelId: string | null, active: boolean) {
  const supabase = createClient();
  return useQuery({
    enabled: !!channelId,
    queryKey: messagesKey(channelId ?? "nenhum"),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_message")
        .select("*")
        .eq("channel_id", channelId as string)
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (error) throw error;
      return data;
    },
    // Só busca sozinho enquanto a tela está aberta e visível.
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
    }: {
      body: string;
      mentionedUserIds: string[];
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
