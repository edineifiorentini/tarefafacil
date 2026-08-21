// Validação de arquivo por magic number (não pela extensão) — seção 10.2.
// Bloqueia executáveis mesmo renomeados; permite imagens, PDF, zip-family
// (docx/xlsx/pptx/zip), áudio (recado de voz) e textos (txt/md/csv/svg)
// pela extensão.

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
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

function detectMime(bytes: Uint8Array): string | null {
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

  // --- Recado de voz -------------------------------------------------
  // O MediaRecorder entrega WebM (EBML) no Chrome e no Firefox e MP4
  // (ftyp, no offset 4) no Safari. Os dois contêineres também carregam
  // vídeo, então o rótulo devolvido aqui é só o palpite do contêiner: o
  // mime final vem de `file.type`, quando o navegador informa. Isso não
  // afrouxa a trava — executável renomeado continua parando na lista de
  // assinaturas bloqueadas e em não ser reconhecido por nenhuma destas.
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "audio/webm";
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return "audio/mp4";
  if (startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return "audio/ogg";
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
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: "Arquivo acima de 25 MB" };
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  for (const sig of BLOCKED_SIGNATURES) {
    if (startsWith(bytes, sig)) {
      return { ok: false, reason: "Tipo não permitido (parece um executável)" };
    }
  }

  const detected = detectMime(bytes);
  if (detected) return { ok: true, mime: file.type || detected };

  // Sem assinatura binária → só aceita como texto pela extensão.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
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
