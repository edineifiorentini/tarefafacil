"use client";

import {
  IconFileText,
  IconFileUnknown,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";

import type { PublicDeliverable, TipoDePreview } from "@/lib/share/publicTask";

import { tamanho } from "./MediaPreview";

/**
 * A troca entre os materiais enviados.
 *
 * **Só ANEXOS entram aqui.** As etapas da demanda vivem no card próprio, do
 * lado. É a confusão mais fácil de cometer nesta tela: numa campanha, tanto
 * as etapas quanto os arquivos se chamam "Bota Fora", "Rádio", "Folder" —
 * mas etapa é o que falta fazer, e anexo é o que já existe para olhar.
 * Misturar os dois faria a pessoa clicar numa etapa esperando ver um
 * arquivo que ainda não foi enviado.
 *
 * Implementado como abas (`tablist` / `tab`) porque é exatamente isto: um
 * conteúdo só, com recortes alternativos. As setas do teclado andam entre
 * elas de graça.
 */

const ICONE: Record<TipoDePreview, typeof IconPhoto> = {
  imagem: IconPhoto,
  video: IconVideo,
  audio: IconMusic,
  pdf: IconFileText,
  outro: IconFileUnknown,
};

const ROTULO: Record<TipoDePreview, string> = {
  imagem: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  pdf: "PDF",
  outro: "Arquivo",
};

export function MediaSwitcher({
  token,
  arquivos,
  atual,
  onEscolher,
}: {
  token: string;
  arquivos: PublicDeliverable[];
  atual: number;
  onEscolher: (i: number) => void;
}) {
  if (arquivos.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label="Materiais enviados"
      className="ap-card-topo flex gap-3 overflow-x-auto px-4 py-3"
    >
      {arquivos.map((a, i) => {
        const Icone = ICONE[a.tipo];
        const selecionado = i === atual;

        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={selecionado}
            onClick={() => onEscolher(i)}
            style={{
              borderColor: selecionado ? "var(--ap-lime)" : "var(--ap-linha)",
              background: selecionado
                ? "var(--ap-superficie-alta)"
                : "transparent",
            }}
            className="flex min-w-56 shrink-0 items-center gap-3 rounded-[12px] border p-2.5 text-left transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ap-lime)]"
          >
            {/* Miniatura de verdade só para imagem. Para o resto, o ícone
                do tipo — um quadrado cinza genérico não diria nada. */}
            <span
              className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px]"
              style={{ background: "var(--ap-fundo)" }}
            >
              {a.tipo === "imagem" ? (
                /* eslint-disable-next-line @next/next/no-img-element -- a
                   rota devolve 302 para URL assinada; o otimizador do Next
                   não a processa. */
                <img
                  src={`/api/d/${token}/anexo/${a.id}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icone
                  size={20}
                  stroke={1.5}
                  className="ap-icone-fraco"
                  aria-hidden
                />
              )}
            </span>

            <span className="flex min-w-0 flex-col">
              <span
                className="truncate text-[length:var(--text-small-size)]"
                style={{
                  color: selecionado ? "var(--ap-tinta)" : "var(--ap-tinta-2)",
                  fontWeight: selecionado ? 600 : 400,
                }}
              >
                {a.filename}
              </span>
              <span className="ap-meta truncate">
                {ROTULO[a.tipo]}
                {a.sizeBytes ? ` · ${tamanho(a.sizeBytes)}` : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
