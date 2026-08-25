"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "avatars";

/**
 * Extrai o caminho dentro do bucket a partir da URL pública guardada.
 *
 * Serve para apagar o arquivo anterior ao trocar de foto. Se a URL não tiver
 * o formato esperado — por ter vindo do Google no cadastro, por exemplo —,
 * devolve null e ninguém tenta apagar nada de lá.
 */
function caminhoDaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marca = `/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i === -1 ? null : url.slice(i + marca.length);
}

/**
 * Troca a foto de perfil.
 *
 * A ordem importa: sobe a nova, grava a URL, e só então apaga a antiga. Se
 * apagasse primeiro e o upload falhasse, a pessoa ficaria sem foto nenhuma
 * por causa de uma falha de rede.
 */
export function useUploadAvatar(userId: string, currentUrl: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (blob: Blob) => {
      // Nome aleatório: o bucket é público, e caminho previsível seria o
      // mesmo que listar as fotos de todo mundo. Também derruba o cache do
      // navegador na troca, sem precisar de `?v=` na URL.
      const caminho = `${userId}/${crypto.randomUUID()}.jpg`;

      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType: "image/jpeg" });
      if (erroUpload) throw erroUpload;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

      const { error: erroPerfil } = await supabase
        .from("app_user")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (erroPerfil) throw erroPerfil;

      const anterior = caminhoDaUrl(currentUrl);
      if (anterior && anterior !== caminho) {
        // Melhor esforço: falhar aqui deixa um arquivo órfão, o que é bem
        // menos grave que recusar uma troca de foto que já funcionou.
        await supabase.storage.from(BUCKET).remove([anterior]);
      }

      return publicUrl;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["members"] });
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useRemoveAvatar(userId: string, currentUrl: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_user")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (error) throw error;

      const caminho = caminhoDaUrl(currentUrl);
      if (caminho) await supabase.storage.from(BUCKET).remove([caminho]);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["members"] });
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}
