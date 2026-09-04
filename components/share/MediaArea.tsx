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
