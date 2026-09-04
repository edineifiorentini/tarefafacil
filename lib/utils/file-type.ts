import { TETO_POR_ARQUIVO, formatarEspaco } from "@/lib/storage/quota";

// Validação de arquivo por magic number (não pela extensão) — seção 10.2.
// Bloqueia executáveis mesmo renomeados; permite imagens, PDF, zip-family
// (docx/xlsx/pptx/zip), áudio (MP3, WAV, OGG, M4A e recado de voz), vídeo
// (MP4, WebM, MOV) e textos (txt/md/csv/svg) pela extensão.
//
// Áudio e vídeo entraram em set/2026 para a aprovação do cliente: a campanha
// que vai para aprovação é peça de rede social, e isso é rádio, vídeo e
// carrossel, não só imagem. O MP3 era recusado por não ter assinatura aqui.

// O teto por arquivo mora em lib/storage/quota.ts desde a 0086, junto com a
// cota por empresa — que é a regra de verdade. Aqui ele é só a trava que faz
// o erro chegar ANTES do envio começar, em vez de virar um 413 cru no meio.
const TEXT_EXT = ["txt", "md", "csv", "svg"];

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  for (let i = 0; i < sig.length; i++) {
    if (bytes[offset + i] !== sig[i]) return false;
  }
  return true;
}

const BLOCKED_SIGNATURES: number[][] = [
  [0x4d, 0x5a], // MZ — .exe / .dll
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0xcf, 0xfa, 0xed, 0xfe], // Mach-O 64 LE
  [0xce, 0xfa, 0xed, 0xfe], // Mach-O 32 LE
  [0xfe, 0xed, 0xfa, 0xcf], // Mach-O BE
];

/** Os quatro bytes da marca do MP4, no offset 8, como texto. */
function marcaFtyp(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes.slice(8, 12));
}

/**
 * MP3 não tem uma assinatura só, tem duas — e as duas são comuns.
 *
 * Arquivo com metadado começa com a etiqueta ID3 ("ID3"); arquivo sem
 * metadado começa direto num quadro, cujo sincronismo são onze bits ligados:
 * `0xFF` seguido de um byte com os três bits altos em 1. Faltavam as duas, e
 * era por isso que todo MP3 era recusado como "tipo não permitido".
 */
function ehMp3(bytes: Uint8Array): boolean {
  if (startsWith(bytes, [0x49, 0x44, 0x33])) return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

function detectMime(bytes: Uint8Array, extensao: string): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46])) {
    // RIFF é contêiner: quem diz o que é são os quatro bytes do offset 8.
    if (startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
    if (startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8)) return "audio/wav";
    return null;
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";

  // --- Áudio e vídeo --------------------------------------------------
  // O MediaRecorder entrega WebM (EBML) no Chrome e no Firefox e MP4
  // (ftyp, no offset 4) no Safari. **Os dois contêineres carregam áudio OU
  // vídeo**, e essa ambiguidade era um defeito real: os dois caíam em
  // `audio/…` fixo, então um MP4 de vídeo enviado sem `file.type` — o
  // navegador nem sempre informa — era guardado como áudio e abria num
  // player sem imagem.
  //
  // O MP4 diz de si mesmo: a marca no offset 8 separa os dois casos.
  // `M4A `/`M4B ` são áudio; `isom`, `mp42`, `avc1` e afins são vídeo.
  //
  // O WebM não diz sem que se percorra o EBML atrás das faixas, o que é
  // caro para o que se ganha. Aí a extensão decide — e ela pode, porque
  // aqui ela não autoriza nada: o arquivo JÁ provou pela assinatura que é
  // um contêiner WebM legítimo, e a extensão só escolhe entre dois rótulos
  // igualmente seguros. Executável renomeado continua parando antes, na
  // lista de assinaturas bloqueadas.
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    return extensao === "weba" ? "audio/webm" : "video/webm";
  }
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    // A extensão vem ANTES da marca, e não é preciosismo: o recado de voz
    // do Safari sai `.m4a`, mas o MediaRecorder de lá nem sempre carimba a
    // marca `M4A ` — sai `isom`, que é a marca genérica. Só pela marca, um
    // recado viraria vídeo.
    if (extensao === "m4a" || extensao === "m4b") return "audio/mp4";
    const marca = marcaFtyp(bytes);
    if (marca.startsWith("M4A") || marca.startsWith("M4B")) return "audio/mp4";
    if (marca.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  if (startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return "audio/ogg";
  if (ehMp3(bytes)) return "audio/mpeg";
  if (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
  )
    return "application/zip";
  return null;
}

export type Validation =
  { ok: true; mime: string } | { ok: false; reason: string };

export async function validateFile(file: File): Promise<Validation> {
  if (file.size > TETO_POR_ARQUIVO) {
    return {
      ok: false,
      reason: `Arquivo acima de ${formatarEspaco(TETO_POR_ARQUIVO)}`,
    };
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  for (const sig of BLOCKED_SIGNATURES) {
    if (startsWith(bytes, sig)) {
      return { ok: false, reason: "Tipo não permitido (parece um executável)" };
    }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  const detected = detectMime(bytes, ext);
  if (detected) return { ok: true, mime: file.type || detected };

  // Sem assinatura binária → só aceita como texto pela extensão.
  if (TEXT_EXT.includes(ext)) {
    return { ok: true, mime: file.type || "text/plain" };
  }
  return { ok: false, reason: "Tipo de arquivo não permitido" };
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 100) || "arquivo"
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
