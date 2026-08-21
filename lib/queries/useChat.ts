"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { totalUnread, unreadByChannel } from "@/lib/chat/unread";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFilename, validateFile } from "@/lib/utils/file-type";
import type {
  ChatChannel,
  ChatChannelMember,
  ChatMessage,
  ChatMessageReaction,
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
/** Ritmo do contador na barra lateral — presente em toda tela do app. */
const SIDEBAR_POLL_MS = 60_000;

/**
 * Bucket compartilhado com o anexo de demanda, mas em caminho próprio:
 * `<workspace>/chat/<canal>/<mensagem>-<arquivo>`.
 *
 * O primeiro nível precisa ser o workspace porque as policies de storage
 * (0006) fazem `foldername(name)[1]::uuid` e chamam `is_member`. O segundo
 * ser "chat" mantém o arquivo fora da varredura de órfãos, que só mexe em
 * `<uuid>/<uuid>/...`.
 */
const BUCKET = "attachments";

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
function reactionsKey(channelId: string) {
  return ["chatReactions", channelId] as const;
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
 * Criar grupo. RPC pelo mesmo motivo de `open_direct_channel`: criar exige
 * gravar participante para várias pessoas, e a policy de escrita de canal é
 * só de owner/admin.
 */
export function useCreateGroupChannel(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      memberIds,
    }: {
      name: string;
      memberIds: string[];
    }): Promise<string> => {
      const { data, error } = await supabase.rpc("create_group_channel", {
        ws: workspaceId,
        nome: name,
        membros: memberIds,
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

export function useAddGroupMembers(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      memberIds,
    }: {
      channelId: string;
      memberIds: string[];
    }) => {
      const { error } = await supabase.rpc("add_group_members", {
        canal: channelId,
        membros: memberIds,
      });
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}

export function useRenameGroupChannel(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      name,
    }: {
      channelId: string;
      name: string;
    }) => {
      const { error } = await supabase.rpc("rename_group_channel", {
        canal: channelId,
        nome: name,
      });
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: channelsKey(workspaceId) }),
  });
}

/** Sair do grupo. Tirar outra pessoa é moderação, que ainda não existe. */
export function useLeaveGroupChannel(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase.rpc("leave_group_channel", {
        canal: channelId,
      });
      if (error) throw error;
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

/**
 * Reações do canal aberto, todas de uma vez.
 *
 * Buscar por mensagem seriam cinquenta consultas por página. A tabela guarda
 * `channel_id` justamente para isto (0055), e o volume é pequeno: uma linha
 * por pessoa por emoji.
 */
export function useChannelReactions(channelId: string | null, active: boolean) {
  const supabase = createClient();
  return useQuery({
    enabled: !!channelId,
    queryKey: reactionsKey(channelId ?? "nenhum"),
    queryFn: async (): Promise<ChatMessageReaction[]> => {
      const { data, error } = await supabase
        .from("chat_message_reaction")
        .select("*")
        .eq("channel_id", channelId as string);
      if (error) throw error;
      return data;
    },
    refetchInterval: active ? POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: POLL_MS,
  });
}

/**
 * Põe ou tira a minha reação.
 *
 * A ficha muda antes da resposta do servidor (regra 6). Reagir é o gesto
 * mais barato da conversa: se ele piscar esperando a rede, a pessoa clica de
 * novo achando que não pegou — e aí são dois pedidos para o mesmo emoji.
 * A chave primária (mensagem, pessoa, emoji) protege o banco disso; a
 * atualização otimista protege a pessoa de precisar tentar.
 */
export function useToggleReaction(workspaceId: string, channelId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const chave = reactionsKey(channelId);

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      mine,
    }: {
      messageId: string;
      emoji: string;
      /** Já é minha? Então o toque tira. */
      mine: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("sem sessão");

      if (mine) {
        const { error } = await supabase
          .from("chat_message_reaction")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("chat_message_reaction").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
        workspace_id: workspaceId,
        channel_id: channelId,
      });
      if (error) throw error;
    },

    onMutate: async ({ messageId, emoji, mine }) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<ChatMessageReaction[]>(chave) ?? [];
      const { data } = await supabase.auth.getUser();
      const meuId = data.user?.id;
      if (!meuId) return { antes };

      qc.setQueryData<ChatMessageReaction[]>(chave, (atual = []) =>
        mine
          ? atual.filter(
              (r) =>
                !(
                  r.message_id === messageId &&
                  r.user_id === meuId &&
                  r.emoji === emoji
                )
            )
          : [
              ...atual,
              {
                message_id: messageId,
                user_id: meuId,
                emoji,
                workspace_id: workspaceId,
                channel_id: channelId,
                created_at: new Date().toISOString(),
              },
            ]
      );
      return { antes };
    },

    onError: (_e, _v, ctx) => {
      // Desfaz a ficha: reação que fica na tela sem ter entrado no banco é
      // pior do que reação que não aparece.
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chave });
    },
  });
}

export function useChatReadState(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: readStateKey(workspaceId),
    queryFn: async (): Promise<ChatReadState[]> => {
      // A RLS já limita às minhas linhas.
      const { data, error } = await supabase
        .from("chat_read_state")
        .select("*");
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
      sectorId,
      file,
      audioDurationMs,
    }: {
      body: string;
      mentionedUserIds: string[];
      replyToId?: string | null;
      /** Etiqueta de assunto. Opcional — a maioria das mensagens não tem. */
      sectorId?: string | null;
      /** Arquivo opcional. No máximo um por mensagem. */
      file?: File | null;
      /**
       * Duração do recado de voz, medida na gravação. Só vem quando o
       * arquivo saiu do gravador — o áudio anexado como arquivo comum não
       * tem quem a informe sem baixar o arquivo inteiro.
       */
      audioDurationMs?: number | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let storageKey: string | null = null;
      let mime: string | null = null;

      if (file) {
        // Mesma validação do anexo de demanda: tamanho, assinatura binária
        // e extensão. Chat não é porta dos fundos para subir executável.
        const check = await validateFile(file);
        if (!check.ok) throw new Error(check.reason);
        mime = check.mime;

        const id = crypto.randomUUID();
        storageKey = `${workspaceId}/chat/${channelId}/${id}-${sanitizeFilename(file.name)}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storageKey, file, { contentType: mime ?? undefined });
        if (upErr) throw upErr;
      }

      const { error } = await supabase.from("chat_message").insert({
        workspace_id: workspaceId,
        channel_id: channelId,
        author_id: user?.id ?? null,
        body,
        mentioned_user_ids: mentionedUserIds,
        reply_to_id: replyToId ?? null,
        sector_id: sectorId ?? null,
        storage_key: storageKey,
        file_name: file ? file.name : null,
        file_size_bytes: file ? file.size : null,
        mime_type: mime,
        audio_duration_ms: file ? (audioDurationMs ?? null) : null,
      });
      if (error) {
        // A mensagem não entrou: o arquivo não pode ficar sozinho no
        // storage, sem nenhuma linha que o alcance.
        if (storageKey)
          await supabase.storage.from(BUCKET).remove([storageKey]);
        throw error;
      }
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

/**
 * Total de não lidas, para o item "Chat" da barra lateral.
 *
 * Mora aqui e não no `ChatView` porque a barra lateral existe em toda tela:
 * importá-lo de lá arrastaria a interface inteira do chat para dentro do
 * bundle de todas as páginas.
 *
 * Busca a cada minuto, não a cada 6s: aqui o que importa é a pessoa ficar
 * sabendo que chegou algo, não ver a mensagem no segundo em que chega.
 */
export function useChatUnreadTotal(workspaceId: string, myId: string | null) {
  const supabase = createClient();
  const { data: recent = [] } = useQuery({
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
    refetchInterval: SIDEBAR_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_MS,
  });
  const { data: readState = [] } = useChatReadState(workspaceId);
  return totalUnread(unreadByChannel(recent, readState, myId));
}

/**
 * URL temporária para abrir o arquivo de uma mensagem.
 *
 * O bucket é privado: sem assinatura, nem quem participa da conversa
 * conseguiria abrir. Cinco minutos bastam para o clique virar download.
 */
export function useChatFileUrl() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async (storageKey: string): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storageKey, 300);
      if (error || !data) throw error ?? new Error("Falha ao abrir o arquivo");
      return data.signedUrl;
    },
  });
}
