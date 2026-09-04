"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  COTA_PADRAO_BYTES,
  cabeNoServidor,
  medirOcupacao,
} from "@/lib/storage/quota";
import { createClient } from "@/lib/supabase/client";
import { sanitizeFilename, validateFile } from "@/lib/utils/file-type";
import type { Attachment } from "@/types/database";

const BUCKET = "attachments";
const MAX_PER_TASK = 20;

function attachmentsKey(workspaceId: string, taskId: string) {
  return ["attachments", workspaceId, taskId] as const;
}

function usoKey(workspaceId: string) {
  return ["storage-uso", workspaceId] as const;
}

/**
 * Quanto a empresa ocupa no servidor, e quanto pode ocupar (0086).
 *
 * O total vem de uma função `security definer` no banco, e não de somar os
 * anexos que a tela por acaso carregou: a tela conhece os anexos de UMA
 * demanda, e a cota é da empresa inteira.
 */
export function useStorageUsage(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: usoKey(workspaceId),
    queryFn: async () => {
      const [uso, ws] = await Promise.all([
        supabase.rpc("workspace_storage_used", { p_workspace: workspaceId }),
        supabase
          .from("workspace")
          .select("storage_limit_bytes")
          .eq("id", workspaceId)
          .maybeSingle(),
      ]);
      if (uso.error) throw uso.error;
      return medirOcupacao(
        Number(uso.data ?? 0),
        Number(ws.data?.storage_limit_bytes ?? COTA_PADRAO_BYTES)
      );
    },
    // O total muda a cada envio e a cada exclusão; buscar de novo a cada
    // foco encheria a rede sem mudar nada na tela.
    staleTime: 30_000,
  });
}

function putWithProgress(
  url: string,
  file: File,
  mime: string,
  onProgress: (fraction: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", mime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no upload (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Falha de rede no upload"));
    xhr.send(file);
  });
}

export function useAttachments(workspaceId: string, taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: attachmentsKey(workspaceId, taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachment")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadAttachment(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = attachmentsKey(workspaceId, taskId);

  const upload = useCallback(
    async (file: File, onProgress: (fraction: number) => void) => {
      const current = qc.getQueryData<Attachment[]>(key) ?? [];
      if (current.length >= MAX_PER_TASK) {
        throw new Error(`Máximo de ${MAX_PER_TASK} anexos por tarefa`);
      }
      const validation = await validateFile(file);
      if (!validation.ok) throw new Error(validation.reason);

      // A cota é lida do banco AGORA, e não do cache: quem está enviando
      // três arquivos seguidos, ou dois colegas ao mesmo tempo, precisa
      // ver o total de verdade. Cache de 30s aqui deixaria estourar.
      const [uso, ws] = await Promise.all([
        supabase.rpc("workspace_storage_used", { p_workspace: workspaceId }),
        supabase
          .from("workspace")
          .select("storage_limit_bytes")
          .eq("id", workspaceId)
          .maybeSingle(),
      ]);
      if (uso.error) throw uso.error;

      const veredito = cabeNoServidor({
        tamanhoDoArquivo: file.size,
        usadoAgora: Number(uso.data ?? 0),
        cota: Number(ws.data?.storage_limit_bytes ?? COTA_PADRAO_BYTES),
      });
      if (!veredito.cabe) throw new Error(veredito.mensagem);

      const attId = crypto.randomUUID();
      const path = `${workspaceId}/${taskId}/${attId}-${sanitizeFilename(file.name)}`;

      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);
      if (signError || !signed) {
        throw signError ?? new Error("Não foi possível preparar o upload");
      }

      await putWithProgress(
        signed.signedUrl,
        file,
        validation.mime,
        onProgress
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("attachment").insert({
        id: attId,
        workspace_id: workspaceId,
        task_id: taskId,
        kind: "file",
        storage_key: path,
        filename: file.name,
        mime_type: validation.mime,
        size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (error) throw error;

      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        // O total da empresa mudou: a barra de espaço tem que acompanhar.
        qc.invalidateQueries({ queryKey: usoKey(workspaceId) }),
      ]);
    },
    [qc, supabase, workspaceId, taskId, key]
  );

  return { upload };
}

export function useAddAttachmentLink(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = attachmentsKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async ({
      url,
      filename,
    }: {
      url: string;
      filename: string;
    }) => {
      const { error } = await supabase.from("attachment").insert({
        workspace_id: workspaceId,
        task_id: taskId,
        kind: "link",
        external_url: url,
        filename,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// Exclui o registro na hora (o objeto no bucket fica para limpeza posterior
// — nada irreversível na mesma sessão, design 10.4).
export function useDeleteAttachment(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = attachmentsKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async (id: string) => {
      // O arquivo tem de sair junto. Apagar só a linha deixava o objeto no
      // storage para sempre: conta crescendo e, pior, um documento que a
      // pessoa acredita ter apagado continuando guardado.
      const { data: alvo } = await supabase
        .from("attachment")
        .select("storage_key")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase.from("attachment").delete().eq("id", id);
      if (error) throw error;

      if (alvo?.storage_key) {
        // Se a remoção do objeto falhar, a linha já saiu — o anexo some da
        // tela como o usuário pediu, e o órfão fica para a varredura
        // periódica recolher. Falhar aqui seria pior que o resíduo.
        await supabase.storage.from(BUCKET).remove([alvo.storage_key]);
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Attachment[]>(key) ?? [];
      qc.setQueryData<Attachment[]>(
        key,
        previous.filter((a) => a.id !== id)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      // Apagar libera espaço, e é justamente o que alguém faz depois de
      // bater na cota. Sem isto a barra continuaria cheia na tela.
      void qc.invalidateQueries({ queryKey: usoKey(workspaceId) });
    },
  });
}

// URL assinada de leitura para exibir a prévia de uma imagem. Cache com
// staleTime abaixo dos 5 min de validade da URL, para renovar antes de expirar.
export function useAttachmentImageUrl(
  storageKey: string | null | undefined,
  enabled: boolean
) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["attachment-image", storageKey],
    enabled: enabled && !!storageKey,
    staleTime: 4 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storageKey as string, 300);
      if (error || !data) throw error ?? new Error("Falha ao carregar prévia");
      return data.signedUrl;
    },
  });
}

// URL assinada de leitura (5 min) para abrir/baixar um anexo de arquivo.
export function useSignedUrl() {
  const supabase = createClient();
  return useCallback(
    async (storageKey: string) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storageKey, 300);
      if (error || !data) throw error ?? new Error("Falha ao abrir o anexo");
      return data.signedUrl;
    },
    [supabase]
  );
}

/**
 * Marca (ou desmarca) um anexo como entregável ao cliente (0083).
 *
 * **É um ato de publicação, não uma etiqueta.** Marcado, o arquivo passa a
 * sair pelo link público da demanda — por isso a tela precisa deixar isso
 * explícito, e por isso o padrão no banco é `false`.
 *
 * Só arquivo: link externo já é público por natureza e o cliente pode
 * abri-lo sem nós no meio.
 */
export function useMarcarEntregavel(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: { id: string; entregavel: boolean }) => {
      const { error } = await supabase
        .from("attachment")
        .update({ entregavel: p.entregavel })
        .eq("id", p.id)
        // Empresa no WHERE, não só na permissão.
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: attachmentsKey(workspaceId, taskId) }),
  });
}
