// Recado de voz: regras que não dependem do navegador, para serem testadas
// sem MediaRecorder e usadas dos dois lados (gravador e tocador).

/**
 * Teto de gravação: dois minutos.
 *
 * É decisão de produto, não limite técnico. Recado de quatro minutos que
 * devia ser uma demanda é o modo de falha conhecido desta função em
 * ferramenta de trabalho — quem ouve não consegue pular, buscar nem copiar.
 * O gravador encerra sozinho ao chegar aqui, em vez de cortar no envio.
 */
export const MAX_RECORDING_MS = 120_000;

/** Velocidades do tocador. 1,5x é o padrão de quem ouve recado alheio. */
export const SPEEDS = [1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export function nextSpeed(atual: Speed): Speed {
  const i = SPEEDS.indexOf(atual);
  return SPEEDS[(i + 1) % SPEEDS.length];
}

/** Rótulo da velocidade em português: "1x", "1,5x", "2x". */
export function speedLabel(s: Speed): string {
  return `${String(s).replace(".", ",")}x`;
}

/**
 * Duração em m:ss. Sempre com dois dígitos no segundo — "1:5" pisca a cada
 * segundo de um jeito que "1:05" não pisca.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}

/**
 * Formato que este navegador sabe gravar.
 *
 * Chrome e Firefox entregam WebM/Opus; o Safari só grava MP4/AAC. Não há um
 * formato que os dois produzam, então a escolha é feita aqui e o arquivo vai
 * como veio — transcodificar exigiria ffmpeg no servidor, que não cabe no
 * serverless de hoje.
 *
 * Devolver `undefined` é resposta válida: significa "grave no formato padrão
 * do navegador", que é o que resta quando nenhum candidato é aceito.
 */
export function pickRecorderMime(
  isSupported: (tipo: string) => boolean
): string | undefined {
  const candidatos = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidatos.find((t) => isSupported(t));
}

/** Extensão para o nome do arquivo, a partir do mime escolhido. */
export function extensionFor(mime: string | undefined): string {
  if (!mime) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

/** Nome do arquivo do recado. Data no nome ajuda quem baixa em lote. */
export function voiceFileName(mime: string | undefined, agora: Date): string {
  const carimbo = agora.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `recado-${carimbo}.${extensionFor(mime)}`;
}
