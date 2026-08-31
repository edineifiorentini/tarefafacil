"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { converterParaWebp } from "@/lib/branding/logo-image";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "logos";

/**
 * Caminho dentro do bucket a partir da URL pública guardada.
 *
 * Serve para apagar a anterior na troca. URL fora do formato esperado
 * devolve null, e ninguém tenta apagar nada.
 */
function caminhoDaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marca = `/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i === -1 ? null : url.slice(i + marca.length);
}

/**
 * Troca a logo da empresa.
 *
 * Mesma ordem deliberada do avatar (`useAvatar`): sobe a nova, grava a URL,
 * e só então apaga a antiga. Apagar primeiro deixaria a empresa sem marca
 * nenhuma se o upload falhasse no meio.
 *
 * Quem pode chegar aqui é dono ou administrador — a policy da 0080 confere
 * pela pasta, então um membro comum recebe recusa do banco, não da tela.
 */
export function useUploadLogo(workspaceId: string, currentUrl: string | null) {
  const supabase = createClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (file: File) => {
      const { blob, extensao } = await converterParaWebp(file);

      // Nome aleatório: o bucket é público, e caminho previsível seria o
      // mesmo que deixar a marca de todo mundo listável. Também derruba o
      // cache do navegador na troca, sem `?v=` pendurado na URL.
      const caminho = `${workspaceId}/${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType: blob.type });
      if (erroUpload) throw erroUpload;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

      const { error: erroEmpresa } = await supabase
        .from("workspace")
        .update({ logo_url: publicUrl })
        .eq("id", workspaceId);
      if (erroEmpresa) throw erroEmpresa;

      const anterior = caminhoDaUrl(currentUrl);
      if (anterior && anterior !== caminho) {
        // Melhor esforço: um arquivo órfão é bem menos grave que recusar uma
        // troca de logo que já deu certo.
        await supabase.storage.from(BUCKET).remove([anterior]);
      }

      return publicUrl;
    },
    // A empresa vem de Server Component, não de query: só `refresh()`
    // repinta a casca. É o mesmo caminho do BrandPicker.
    onSuccess: () => router.refresh(),
  });
}

/** Remove a logo. A casca volta para a marca do TAFLOW. */
export function useRemoveLogo(workspaceId: string, currentUrl: string | null) {
  const supabase = createClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workspace")
        .update({ logo_url: null })
        .eq("id", workspaceId);
      if (error) throw error;

      const caminho = caminhoDaUrl(currentUrl);
      if (caminho) await supabase.storage.from(BUCKET).remove([caminho]);
    },
    onSuccess: () => router.refresh(),
  });
}
