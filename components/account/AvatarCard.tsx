"use client";

import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  AVATAR_MESSAGES,
  PrepareAvatarError,
  centerSquare,
  cropToBlob,
  isSquare,
  readImage,
  releaseImage,
  type CropBox,
} from "@/lib/images/avatar";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useRemoveAvatar, useUploadAvatar } from "@/lib/queries/useAvatar";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { AvatarCropper } from "./AvatarCropper";

/**
 * Foto de perfil.
 *
 * A foto é reduzida e cortada no navegador antes de subir — 256px, quadrada,
 * sem os metadados do celular. Ver `lib/images/avatar.ts` para o porquê de
 * cada uma dessas três coisas.
 *
 * Não há corte manual com arrastar e ampliar. Seria bonito e é o tipo de
 * coisa que se constrói depois de alguém reclamar do recorte central; hoje
 * seria trabalho antes de existir o problema.
 */
export function AvatarCard() {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [], isPending } = useMembers(workspace.id);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  /** Imagem esperando enquadramento. Nula = não há recortador aberto. */
  const [recortando, setRecortando] = useState<HTMLImageElement | null>(null);

  const eu = members.find((m) => m.user_id === userId);
  const nome = eu?.display_name ?? eu?.email ?? "Você";
  const atual = eu?.avatar_url ?? null;

  const upload = useUploadAvatar(userId ?? "", atual);
  const remover = useRemoveAvatar(userId ?? "", atual);

  if (isPending || !userId) {
    return <Skeleton variant="block" className="h-40" />;
  }

  function falhou(e: unknown) {
    setErro(
      e instanceof PrepareAvatarError
        ? AVATAR_MESSAGES[e.kind]
        : "Não foi possível salvar a foto agora"
    );
  }

  /**
   * Imagem já quadrada sobe direto; o resto passa pelo enquadramento.
   *
   * Abrir o recortador para uma foto quadrada seria pedir confirmação do
   * óbvio — não há o que decidir quando a imagem inteira já é o recorte.
   */
  async function escolher(file: File) {
    setErro(null);
    try {
      const img = await readImage(file);
      if (!isSquare(img)) {
        setRecortando(img);
        return;
      }
      try {
        await upload.mutateAsync(await cropToBlob(img, centerSquare(img)));
        toast.show({ message: "Foto atualizada" });
      } finally {
        releaseImage(img);
      }
    } catch (e) {
      falhou(e);
    }
  }

  async function confirmarRecorte(crop: CropBox) {
    if (!recortando) return;
    try {
      await upload.mutateAsync(await cropToBlob(recortando, crop));
      toast.show({ message: "Foto atualizada" });
      fecharRecorte();
    } catch (e) {
      falhou(e);
      fecharRecorte();
    }
  }

  function fecharRecorte() {
    // Revoga a URL temporária ao sair, por qualquer caminho: cancelar, salvar
    // ou falhar. Sem isso cada foto testada fica presa na memória da aba.
    if (recortando) releaseImage(recortando);
    setRecortando(null);
  }

  return (
    <section className="border-line bg-card flex max-w-xl flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-fg font-medium">Foto de perfil</h2>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Aparece nas demandas, no chat e na lista da equipe
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Grande aqui de propósito: é a única tela em que a pessoa precisa
            ver a foto do tamanho que escolheu, não do tamanho que o resto do
            app usa. */}
        <span className="shrink-0">
          <Avatar name={nome} src={atual ?? undefined} size="xl" />
        </span>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              isLoading={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {atual ? "Trocar foto" : "Escolher foto"}
            </Button>
            {atual ? (
              <Button
                variant="ghost"
                size="sm"
                isLoading={remover.isPending}
                onClick={async () => {
                  await remover.mutateAsync();
                  toast.show({ message: "Foto removida" });
                }}
              >
                Remover
              </Button>
            ) : null}
          </div>
          <span className="text-fg-muted text-[length:var(--text-caption-size)]">
            JPG, PNG ou WebP. A imagem é recortada em quadrado e reduzida antes
            de subir
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Limpa o valor para escolher o MESMO arquivo de novo disparar o
          // evento — acontece quando a primeira tentativa falha.
          e.target.value = "";
          if (file) void escolher(file);
        }}
      />

      {erro ? (
        <p
          role="alert"
          className="text-overdue text-[length:var(--text-small-size)]"
        >
          {erro}
        </p>
      ) : null}

      {recortando ? (
        <AvatarCropper
          image={recortando}
          open
          saving={upload.isPending}
          onCancel={fecharRecorte}
          onConfirm={(crop) => void confirmarRecorte(crop)}
        />
      ) : null}
    </section>
  );
}
