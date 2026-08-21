"use client";

import {
  IconMicrophone,
  IconPlayerStopFilled,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import {
  formatDuration,
  MAX_RECORDING_MS,
  pickRecorderMime,
  voiceFileName,
} from "@/lib/chat/audio";

/**
 * Gravador de recado de voz.
 *
 * Entrega um `File` pronto para o mesmo caminho de envio do anexo — recado
 * de voz é o anexo da 0048 com um gravador na frente, não um fluxo à parte.
 *
 * A duração vai junto porque quem sabe quanto tempo durou é quem gravou:
 * WebM do MediaRecorder não traz duração no cabeçalho, e o <audio> devolve
 * `Infinity` até alguém procurar até o fim do arquivo.
 */
export function VoiceRecorder({
  disabled,
  onReady,
}: {
  disabled?: boolean;
  onReady: (file: File, durationMs: number) => void;
}) {
  const toast = useToast();
  const [gravando, setGravando] = useState(false);
  const [decorrido, setDecorrido] = useState(0);

  const recorder = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const inicio = useRef(0);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  // Descartar não pode depender de estado: o `onstop` do MediaRecorder roda
  // fora do render e leria o valor da renderização em que foi criado.
  const descartar = useRef(false);

  function pararRelogio() {
    if (relogio.current) clearInterval(relogio.current);
    relogio.current = null;
  }

  // Soltar o microfone quando o componente sai. Sem isto o indicador de
  // gravação do navegador fica aceso depois de fechar a conversa — a pessoa
  // fica achando, com razão, que continua sendo ouvida.
  useEffect(() => {
    return () => {
      pararRelogio();
      const r = recorder.current;
      if (r && r.state !== "inactive") {
        descartar.current = true;
        r.stop();
      }
      r?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function comecar() {
    if (disabled || gravando) return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      toast.show({
        message: "Este navegador não grava áudio. Anexe um arquivo.",
      });
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // Recusa silenciosa é o pior desfecho: a pessoa aperta e nada
      // acontece. Cada motivo tem a sua frase, e todas dizem o que fazer.
      const nome = e instanceof Error ? e.name : "";
      toast.show({
        message:
          nome === "NotAllowedError"
            ? "Microfone bloqueado. Libere o acesso nas permissões do navegador."
            : nome === "NotFoundError"
              ? "Nenhum microfone encontrado"
              : "Não foi possível abrir o microfone",
      });
      return;
    }

    const mime = pickRecorderMime((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(
      stream,
      mime ? { mimeType: mime } : undefined
    );
    recorder.current = rec;
    pedacos.current = [];
    descartar.current = false;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) pedacos.current.push(e.data);
    };

    rec.onstop = () => {
      pararRelogio();
      stream.getTracks().forEach((t) => t.stop());
      const duracao = Date.now() - inicio.current;
      const partes = pedacos.current;
      pedacos.current = [];
      recorder.current = null;
      setGravando(false);
      setDecorrido(0);

      if (descartar.current) return;
      // Toque de meio segundo é engano — quase sempre a pessoa apertou duas
      // vezes. Mandar isso para a conversa só gera ruído.
      if (duracao < 1000 || partes.length === 0) {
        toast.show({ message: "Recado curto demais" });
        return;
      }
      const tipo = rec.mimeType || mime || "audio/webm";
      const blob = new Blob(partes, { type: tipo });
      onReady(
        new File([blob], voiceFileName(tipo, new Date()), { type: tipo }),
        duracao
      );
    };

    inicio.current = Date.now();
    rec.start();
    setGravando(true);
    setDecorrido(0);

    relogio.current = setInterval(() => {
      const passado = Date.now() - inicio.current;
      setDecorrido(passado);
      // O teto encerra a gravação em vez de cortar no envio: descobrir que
      // passou do limite depois de falar dois minutos é perder o recado.
      if (
        passado >= MAX_RECORDING_MS &&
        recorder.current?.state === "recording"
      ) {
        recorder.current.stop();
      }
    }, 200);
  }

  function terminar(jogarFora: boolean) {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") return;
    descartar.current = jogarFora;
    rec.stop();
  }

  if (!gravando) {
    return (
      <button
        type="button"
        onClick={comecar}
        disabled={disabled}
        className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-2 text-[length:var(--text-caption-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <IconMicrophone size={14} stroke={1.5} aria-hidden />
        Gravar
      </button>
    );
  }

  const restante = MAX_RECORDING_MS - decorrido;
  const acabando = restante <= 15_000;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span
        aria-hidden
        className="bg-overdue inline-block h-2 w-2 shrink-0 [animation:tf-pulse_1.2s_ease-in-out_infinite] rounded-full"
      />
      <span
        // Só o texto muda; o leitor de tela não precisa ouvir cada segundo.
        aria-live="polite"
        aria-atomic="true"
        className={`tnum text-[length:var(--text-caption-size)] ${
          acabando ? "text-overdue" : "text-fg-secondary"
        }`}
      >
        Gravando {formatDuration(decorrido)}
        {acabando ? ` · resta ${formatDuration(restante)}` : ""}
      </span>
      <button
        type="button"
        aria-label="Descartar gravação"
        onClick={() => terminar(true)}
        className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)]"
      >
        <IconX size={15} stroke={1.75} />
      </button>
      <button
        type="button"
        aria-label="Concluir gravação"
        onClick={() => terminar(false)}
        className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)]"
      >
        <IconPlayerStopFilled size={14} stroke={1.75} />
      </button>
    </div>
  );
}
