"use client";

import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import {
  formatDuration,
  nextSpeed,
  speedLabel,
  type Speed,
} from "@/lib/chat/audio";
import { useChatFileUrl } from "@/lib/queries/useChat";

/**
 * Quem está tocando agora, na página inteira. Dois recados falando junto é
 * ruído que a pessoa não sabe de onde vem — e para calar precisa achar os
 * dois botões.
 */
let tocandoAgora: HTMLAudioElement | null = null;

/**
 * Tocador do recado de voz.
 *
 * Três decisões, todas contra o mesmo problema — áudio tira do ouvinte o
 * controle que o texto dá de graça:
 *
 * 1. **A duração aparece antes de tocar.** Ela vem do banco
 *    (`audio_duration_ms`, gravada na hora de gravar), não do arquivo:
 *    quem abre a conversa decide se vale ouvir sem baixar nada.
 * 2. **Velocidade 1x / 1,5x / 2x**, que é o que devolve o "pular" do texto.
 * 3. **A URL só é assinada no primeiro play.** Assinar tudo ao abrir a
 *    conversa geraria uma chamada por recado para arquivos que ninguém
 *    pediu.
 *
 * O denominador da barra é sempre `durationMs`, nunca `audio.duration`:
 * WebM do MediaRecorder chega sem duração no cabeçalho e o elemento devolve
 * `Infinity`, o que faria a barra nunca sair do zero.
 */
export function AudioMessage({
  storageKey,
  durationMs,
  fileName,
}: {
  storageKey: string;
  durationMs: number | null;
  fileName?: string | null;
}) {
  const toast = useToast();
  const pegarUrl = useChatFileUrl();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  const [posicao, setPosicao] = useState(0);
  const [velocidade, setVelocidade] = useState<Speed>(1);
  const [carregando, setCarregando] = useState(false);

  // Áudio tocando em conversa fechada é o tipo de coisa que a pessoa não
  // consegue desligar depois.
  useEffect(() => {
    return () => {
      if (tocandoAgora === audio.current) tocandoAgora = null;
      audio.current?.pause();
      audio.current = null;
    };
  }, []);

  function tocar(el: HTMLAudioElement) {
    if (tocandoAgora && tocandoAgora !== el) tocandoAgora.pause();
    tocandoAgora = el;
    void el.play();
    setTocando(true);
  }

  function prepararElemento(url: string): HTMLAudioElement {
    const el = new Audio(url);
    el.playbackRate = velocidade;
    el.ontimeupdate = () => setPosicao(el.currentTime * 1000);
    el.onended = () => {
      setTocando(false);
      setPosicao(0);
    };
    el.onerror = () => {
      // Acontece de verdade: recado gravado no Safari (mp4) ou no Chrome
      // (webm) pode não tocar no outro navegador. Dizer isso é melhor do
      // que um botão que não faz nada.
      setTocando(false);
      toast.show({ message: "Este navegador não conseguiu tocar o recado" });
    };
    audio.current = el;
    return el;
  }

  function alternar() {
    const atual = audio.current;
    if (atual) {
      if (tocando) {
        atual.pause();
        setTocando(false);
      } else {
        tocar(atual);
      }
      return;
    }

    setCarregando(true);
    pegarUrl.mutate(storageKey, {
      onSuccess: (url) => {
        setCarregando(false);
        tocar(prepararElemento(url));
      },
      onError: () => {
        setCarregando(false);
        toast.show({ message: "Não foi possível abrir o recado" });
      },
    });
  }

  function trocarVelocidade() {
    const nova = nextSpeed(velocidade);
    setVelocidade(nova);
    if (audio.current) audio.current.playbackRate = nova;
  }

  const total = durationMs ?? 0;
  const progresso = total > 0 ? Math.min(100, (posicao / total) * 100) : 0;
  const rotulo = total > 0 ? formatDuration(total) : (fileName ?? "Recado");

  return (
    <div className="border-line bg-sunken mt-1 flex max-w-full items-center gap-2 rounded-sm border px-2 py-1.5">
      <button
        type="button"
        aria-label={tocando ? "Pausar recado" : `Tocar recado de ${rotulo}`}
        onClick={alternar}
        disabled={carregando}
        className="text-fg hover:bg-hover inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors [transition-duration:var(--dur-fast)] disabled:opacity-60"
      >
        {tocando ? (
          <IconPlayerPauseFilled size={14} />
        ) : (
          <IconPlayerPlayFilled size={14} />
        )}
      </button>

      <div className="min-w-24 flex-1">
        <div
          role="progressbar"
          aria-label="Posição do recado"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progresso)}
          className="bg-line h-1 w-full overflow-hidden rounded-full"
        >
          <div
            className="h-full rounded-full bg-[var(--button-primary-bg)]"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <span className="tnum text-fg-muted shrink-0 text-[length:var(--text-caption-size)]">
        {total > 0
          ? tocando || posicao > 0
            ? `${formatDuration(posicao)} / ${formatDuration(total)}`
            : formatDuration(total)
          : rotulo}
      </span>

      <button
        type="button"
        onClick={trocarVelocidade}
        aria-label={`Velocidade ${speedLabel(velocidade)}, tocar para mudar`}
        className="tnum text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 shrink-0 items-center rounded-sm px-1.5 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)]"
      >
        {speedLabel(velocidade)}
      </button>
    </div>
  );
}
