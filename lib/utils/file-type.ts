// Validação de arquivo por magic number (não pela extensão) — seção 10.2.
// Bloqueia executáveis mesmo renomeados; permite imagens, PDF, zip-family
// (docx/xlsx/pptx/zip) e textos (txt/md/csv/svg) pela extensão.

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
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "image/webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
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
