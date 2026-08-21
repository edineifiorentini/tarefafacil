import { describe, expect, it } from "vitest";

import { sanitizeFilename, validateFile } from "./file-type";

/** Arquivo com os bytes dados no começo — é só o cabeçalho que importa. */
function arquivo(bytes: number[], nome: string, type = ""): File {
  const conteudo = new Uint8Array([...bytes, ...new Array(32).fill(0)]);
  return new File([conteudo], nome, { type });
}

const EBML = [0x1a, 0x45, 0xdf, 0xa3];
const FTYP = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70];
const OGGS = [0x4f, 0x67, 0x67, 0x53];
const RIFF_WAVE = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
];
const RIFF_WEBP = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

describe("recado de voz", () => {
  it("aceita webm do Chrome e do Firefox", async () => {
    const r = await validateFile(
      arquivo(EBML, "recado.webm", "audio/webm;codecs=opus")
    );
    expect(r.ok).toBe(true);
    // O mime informado pelo navegador prevalece sobre o palpite do
    // contêiner: é ele que diz que é áudio, e não vídeo.
    if (r.ok) expect(r.mime).toBe("audio/webm;codecs=opus");
  });

  it("aceita mp4 do Safari", async () => {
    const r = await validateFile(arquivo(FTYP, "recado.m4a", "audio/mp4"));
    expect(r.ok).toBe(true);
  });

  it("aceita ogg e wav", async () => {
    expect((await validateFile(arquivo(OGGS, "a.ogg"))).ok).toBe(true);
    expect((await validateFile(arquivo(RIFF_WAVE, "a.wav"))).ok).toBe(true);
  });

  it("reconhece o formato mesmo sem o navegador informar o tipo", async () => {
    const r = await validateFile(arquivo(EBML, "recado.webm"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("audio/webm");
  });
});

describe("o que continua barrado", () => {
  it("recusa executável, mesmo com nome e tipo de áudio", async () => {
    const exe = arquivo([0x4d, 0x5a], "recado.webm", "audio/webm");
    const r = await validateFile(exe);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/executável/);
  });

  it("recusa ELF disfarçado de áudio", async () => {
    const elf = arquivo([0x7f, 0x45, 0x4c, 0x46], "recado.ogg", "audio/ogg");
    expect((await validateFile(elf)).ok).toBe(false);
  });

  it("recusa arquivo sem assinatura conhecida, com extensão de áudio", async () => {
    const r = await validateFile(arquivo([0x00, 0x01, 0x02, 0x03], "x.webm"));
    expect(r.ok).toBe(false);
  });
});

describe("o que já valia continua valendo", () => {
  it("webp não virou wav — o RIFF é o mesmo, o rótulo não", async () => {
    const r = await validateFile(arquivo(RIFF_WEBP, "foto.webp"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("image/webp");
  });

  it("aceita png e pdf", async () => {
    const png = arquivo([0x89, 0x50, 0x4e, 0x47], "a.png");
    const pdf = arquivo([0x25, 0x50, 0x44, 0x46], "a.pdf");
    expect((await validateFile(png)).ok).toBe(true);
    expect((await validateFile(pdf)).ok).toBe(true);
  });
});

describe("sanitizeFilename", () => {
  it("mantém o nome do recado utilizável", () => {
    expect(sanitizeFilename("recado-2026-08-21-14-35.webm")).toBe(
      "recado-2026-08-21-14-35.webm"
    );
  });
});
