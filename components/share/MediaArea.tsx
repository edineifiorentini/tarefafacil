"use client";

import { useState } from "react";

import { IconPhotoOff } from "@tabler/icons-react";

import type { PublicDeliverable } from "@/lib/share/publicTask";

import { MediaPreview } from "./MediaPreview";
import { MediaSwitcher } from "./MediaSwitcher";

/**
 * A coluna da esquerda: a peça e a troca entre as peças.
 *
 * O índice do arquivo em foco mora AQUI e não sobe para a página. É o
 * menor lugar possível: a coluna da direita não precisa dele — a aprovação
 * no banco é por DEMANDA, via token, não por arquivo (ver
 * `record_task_approval`). Subir esse estado transformaria os três cards
 * de contexto em componentes de cliente sem nenhum ganho.
 */
export function MediaArea({
  token,
  arquivos,
  aprovado,
}: {
  token: string;
  arquivos: PublicDeliverable[];
  aprovado: boolean;
}) {
  const [atual, setAtual] = useState(0);

  if (arquivos.length === 0) {
    return (
      <section className="ap-card flex flex-col items-center gap-3 px-6 py-20 text-center">
        <IconPhotoOff
          size={30}
          stroke={1.5}
          aria-hidden
          className="ap-icone-fraco"
        />
        <p className="ap-texto">Este material ainda não possui uma prévia.</p>
        <p className="ap-meta max-w-sm">
          Quem está cuidando da demanda ainda não publicou nenhum arquivo para
          aprovação. Você será avisado quando isso acontecer.
        </p>
      </section>
    );
  }

  const indice = Math.min(atual, arquivos.length - 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="ap-card flex flex-col overflow-hidden">
        <MediaPreview
          token={token}
          arquivo={arquivos[indice]}
          indice={indice}
          total={arquivos.length}
          aprovado={aprovado}
          onAnterior={() =>
            setAtual((i) => (i - 1 + arquivos.length) % arquivos.length)
          }
          onProximo={() => setAtual((i) => (i + 1) % arquivos.length)}
        />

        <MediaSwitcher
          token={token}
          arquivos={arquivos}
          atual={indice}
          onEscolher={setAtual}
        />

        <RecadoDaVersao arquivo={arquivos[indice]} />

        <p
          className="ap-meta border-t px-4 py-3"
          style={{ borderColor: "var(--ap-linha)" }}
        >
          O download será liberado após a aprovação desta versão.
        </p>
      </div>
    </div>
  );
}

/**
 * O que mudou nesta versão, na voz de quem produziu (0093).
 *
 * **"Versão 1" não aparece, e é de propósito.** Numerar o primeiro envio
 * não informa nada — o cliente não tem com o que comparar — e ainda sugere
 * um processo do qual ele não participou. A partir da segunda o número
 * responde a pergunta que ele realmente tem: "isto já é a correção que eu
 * pedi?".
 *
 * O recado é texto puro, escrito num campo comum e desenhado como texto:
 * nada aqui interpreta marcação, nem HTML.
 */
function RecadoDaVersao({ arquivo }: { arquivo: PublicDeliverable }) {
  const mostrarVersao = arquivo.versao > 1;
  if (!mostrarVersao && !arquivo.mensagemAoCliente) return null;

  return (
    <div
      className="flex flex-col gap-1 border-t px-4 py-3"
      style={{ borderColor: "var(--ap-linha)" }}
    >
      {mostrarVersao ? (
        <p
          className="text-[length:var(--text-caption-size)] font-medium"
          style={{ color: "var(--ap-tinta)" }}
        >
          Versão {arquivo.versao}
        </p>
      ) : null}
      {arquivo.mensagemAoCliente ? (
        <p className="ap-texto whitespace-pre-wrap">
          {arquivo.mensagemAoCliente}
        </p>
      ) : null}
    </div>
  );
}
