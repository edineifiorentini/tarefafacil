"use client";

import { useRef, useState } from "react";

import { IconTrash, IconUpload } from "@tabler/icons-react";

import { WorkspaceMark } from "@/components/branding/WorkspaceMark";
import { useToast } from "@/components/ui/Toast";
import { TIPOS_ACEITOS, validarArquivoDeLogo } from "@/lib/branding/logo";
import { useRemoveLogo, useUploadLogo } from "@/lib/queries/useLogo";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * Envio da logo da empresa (0080).
 *
 * **Sem recorte, ao contrário da foto de perfil.** O avatar recorta porque
 * um rosto dentro de um círculo precisa de enquadramento. Uma logo já vem na
 * proporção que alguém desenhou — forçá-la num quadrado a estraga. Aqui ela
 * é conferida e reduzida, nunca cortada.
 *
 * O que aparece acima do botão é o `WorkspaceMark` de verdade, no mesmo
 * tamanho da casca. É a única forma honesta de mostrar o resultado: prévia
 * desenhada à parte mente sobre o teto de altura.
 */
export function LogoPicker() {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const toast = useToast();

  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const logo = workspace.logo_url;
  const enviar = useUploadLogo(workspace.id, logo);
  const remover = useRemoveLogo(workspace.id, logo);

  const eu = members.find((m) => m.user_id === userId);
  const podeMexer = eu?.role === "owner" || eu?.role === "admin";
  const ocupado = enviar.isPending || remover.isPending;

  function escolher(file: File | undefined) {
    if (!file) return;

    const conferido = validarArquivoDeLogo(file);
    if (!conferido.ok) {
      setErro(conferido.motivo);
      return;
    }

    setErro(null);
    enviar.mutate(file, {
      onSuccess: () => toast.show({ message: "Logo atualizada" }),
      // A policy da 0080 recusa quem não administra a empresa. A tela já
      // esconde o botão, mas a mensagem existe para o caso de o papel ter
      // mudado com a aba aberta.
      onError: () => setErro("Não foi possível enviar. Tente de novo"),
    });

    // Zera o input: escolher o MESMO arquivo depois de um erro não dispara
    // `change` de novo, e a tela pareceria travada.
    if (input.current) input.current.value = "";
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-fg font-medium">Logo</h3>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {podeMexer
            ? "Aparece no lugar do nome da empresa"
            : "Só quem administra a empresa pode mudar"}
        </p>
      </div>

      <div className="border-line bg-sunken flex items-center gap-4 rounded-md border p-4">
        <WorkspaceMark name={workspace.name} logoUrl={logo} contexto="casca" />

        {podeMexer ? (
          <div className="ml-auto flex items-center gap-2">
            {/* Label e não button: o input de arquivo já é acessível por
                teclado, e envolvê-lo dispensa o clique programático. */}
            <label
              className={`border-line text-fg inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)] ${
                ocupado
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-hover cursor-pointer"
              }`}
            >
              <IconUpload size={16} stroke={1.75} aria-hidden />
              {logo ? "Trocar" : "Enviar"}
              <input
                ref={input}
                type="file"
                accept={TIPOS_ACEITOS.join(",")}
                disabled={ocupado}
                onChange={(e) => escolher(e.target.files?.[0])}
                className="sr-only"
              />
            </label>

            {logo ? (
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  remover.mutate(undefined, {
                    onSuccess: () =>
                      toast.show({ message: "Logo removida" }),
                    onError: () =>
                      setErro("Não foi possível remover. Tente de novo"),
                  })
                }
                aria-label="Remover logo"
                className="border-line text-fg hover:bg-hover inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconTrash size={16} stroke={1.75} aria-hidden />
                Remover
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
        PNG, WebP ou JPEG. A imagem é convertida para WebP e reduzida — o
        arquivo original não precisa ser leve.
      </p>

      {erro ? (
        <p
          role="alert"
          className="text-[length:var(--text-caption-size)] text-[var(--negative)]"
        >
          {erro}
        </p>
      ) : null}

      {!logo ? (
        <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
          Sem logo, a casca mostra a marca do TAFLOW. No contrato
          impresso aparece o nome da empresa.
        </p>
      ) : null}
    </section>
  );
}
