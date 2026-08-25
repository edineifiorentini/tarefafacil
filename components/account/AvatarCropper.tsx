"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cropFromView, type CropBox } from "@/lib/images/avatar";

/**
 * Escolha da área da foto, com máscara redonda.
 *
 * Aparece só quando a imagem NÃO é quadrada — que é quando existe uma
 * decisão a tomar. Foto já quadrada sobe direto: abrir um recortador para
 * confirmar o óbvio é pedágio.
 *
 * **Arrastar não é o único jeito de mexer.** A regra 4 do projeto pede
 * teclado em tudo que é interativo, e recortador costuma ser o primeiro a
 * esquecer disso: as setas movem, `+` e `-` aproximam, e o controle de
 * aproximação é um `range` nativo. Quem não usa mouse consegue enquadrar.
 *
 * A máscara é o retrato do resultado: o que está dentro do círculo é
 * exatamente o que vai virar avatar, porque `Avatar` desenha em círculo. Por
 * isso o de fora fica escurecido em vez de escondido — a pessoa precisa ver
 * o que está deixando de fora para decidir.
 */
const BOX = 288;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
/** Quanto uma seta do teclado move, em pixels da tela. */
const PASSO_TECLADO = 12;

type Offset = { x: number; y: number };

export function AvatarCropper({
  image,
  open,
  onCancel,
  onConfirm,
  saving,
}: {
  image: HTMLImageElement;
  open: boolean;
  onCancel: () => void;
  onConfirm: (crop: CropBox) => void;
  saving: boolean;
}) {
  // Escala em que o menor lado da imagem preenche exatamente a caixa.
  const base = BOX / Math.min(image.width, image.height);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>(() => {
    const escala = base;
    return {
      x: (BOX - image.width * escala) / 2,
      y: (BOX - image.height * escala) / 2,
    };
  });

  const arrastando = useRef<{ x: number; y: number } | null>(null);
  const escala = base * zoom;
  const largura = image.width * escala;
  const altura = image.height * escala;

  /**
   * Impede que sobre borda vazia dentro da caixa.
   *
   * Sem isto dá para arrastar a foto para fora e recortar um pedaço de nada,
   * que vira uma faixa preta no avatar — e só se descobre depois de salvar.
   */
  function limitar(next: Offset): Offset {
    return {
      x: Math.min(0, Math.max(BOX - largura, next.x)),
      y: Math.min(0, Math.max(BOX - altura, next.y)),
    };
  }

  function mover(dx: number, dy: number) {
    setOffset((o) => limitar({ x: o.x + dx, y: o.y + dy }));
  }

  /** Aproxima mantendo o centro da caixa no lugar. */
  function ajustarZoom(novo: number) {
    const alvo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, novo));
    setOffset((o) => {
      const fator = alvo / zoom;
      const centro = BOX / 2;
      return limitarCom(
        {
          x: centro - (centro - o.x) * fator,
          y: centro - (centro - o.y) * fator,
        },
        image.width * base * alvo,
        image.height * base * alvo
      );
    });
    setZoom(alvo);
  }

  function limitarCom(next: Offset, w: number, h: number): Offset {
    return {
      x: Math.min(0, Math.max(BOX - w, next.x)),
      y: Math.min(0, Math.max(BOX - h, next.y)),
    };
  }

  function confirmar() {
    onConfirm(
      cropFromView({
        imageWidth: image.width,
        imageHeight: image.height,
        box: BOX,
        zoom,
        offset,
      })
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)]" />
        <Dialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md p-5">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-medium">
              Enquadre a foto
            </Dialog.Title>
            <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
              Arraste para mover e use o controle abaixo para aproximar. Com o
              teclado: setas movem, + e − aproximam
            </Dialog.Description>
          </div>

          <div
            role="group"
            aria-label="Área da foto"
            tabIndex={0}
            onKeyDown={(e) => {
              const passo = e.shiftKey ? PASSO_TECLADO * 3 : PASSO_TECLADO;
              const acoes: Record<string, () => void> = {
                ArrowLeft: () => mover(passo, 0),
                ArrowRight: () => mover(-passo, 0),
                ArrowUp: () => mover(0, passo),
                ArrowDown: () => mover(0, -passo),
                "+": () => ajustarZoom(zoom + ZOOM_STEP),
                "=": () => ajustarZoom(zoom + ZOOM_STEP),
                "-": () => ajustarZoom(zoom - ZOOM_STEP),
              };
              const acao = acoes[e.key];
              if (!acao) return;
              // Seta dentro de um diálogo rola a página atrás dele.
              e.preventDefault();
              acao();
            }}
            onPointerDown={(e) => {
              arrastando.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const de = arrastando.current;
              if (!de) return;
              mover(e.clientX - de.x, e.clientY - de.y);
              arrastando.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              arrastando.current = null;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            style={{ width: BOX, height: BOX }}
            className="bg-sunken relative mx-auto cursor-grab touch-none overflow-hidden rounded-md outline-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt=""
              draggable={false}
              style={{
                width: largura,
                height: altura,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
              className="max-w-none origin-top-left"
            />

            {/* A máscara: o círculo fica limpo e o resto escurece. A sombra
                gigante é o que pinta "tudo menos o círculo" sem precisar de
                SVG nem de segundo elemento. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_var(--overlay)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <IconMinus
              size={16}
              stroke={1.75}
              aria-hidden
              className="text-fg-muted shrink-0"
            />
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => ajustarZoom(Number(e.target.value))}
              aria-label="Aproximação"
              className="h-1 flex-1 accent-[var(--brand-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
            />
            <IconPlus
              size={16}
              stroke={1.75}
              aria-hidden
              className="text-fg-muted shrink-0"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={saving}
              onClick={confirmar}
            >
              Usar esta área
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
