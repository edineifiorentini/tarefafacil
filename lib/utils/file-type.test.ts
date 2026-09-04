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
    // O palpite do contêiner mudou de propósito em set/2026: `.webm` sem
    // tipo informado passou a valer VÍDEO, porque WebM é antes de tudo um
    // formato de vídeo e um vídeo rotulado como áudio abre num player sem
    // imagem — defeito visível para o cliente na tela de aprovação.
    //
    // O recado de voz não é atingido: `VoiceRecorder` sempre constrói o
    // File com `{ type }`, e o tipo informado prevalece sobre o palpite.
    // Este caso aqui é o arquivo que chega sem tipo nenhum.
    if (r.ok) expect(r.mime).toBe("video/webm");
  });

  it("recado do Safari continua áudio, mesmo com marca genérica", async () => {
    // `isom` é a marca que o MediaRecorder do Safari costuma gravar. Só
    // pela marca isto viraria vídeo; a extensão `.m4a` é que resolve.
    const isom = [...FTYP, 0x69, 0x73, 0x6f, 0x6d];
    const r = await validateFile(arquivo(isom, "recado-2026-09-04-10-00.m4a"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("audio/mp4");
  });
});

describe("áudio e vídeo da aprovação (set/2026)", () => {
  it("aceita MP3 com etiqueta ID3", async () => {
    const r = await validateFile(
      arquivo([0x49, 0x44, 0x33, 0x03], "radio.mp3")
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("audio/mpeg");
  });

  it("aceita MP3 sem etiqueta, pelo sincronismo do quadro", async () => {
    const r = await validateFile(
      arquivo([0xff, 0xfb, 0x90, 0x00], "radio.mp3")
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("audio/mpeg");
  });

  it("MP4 de vídeo não é mais rotulado como áudio", async () => {
    const isom = [...FTYP, 0x69, 0x73, 0x6f, 0x6d];
    const r = await validateFile(arquivo(isom, "campanha.mp4"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("video/mp4");
  });

  it("MOV do celular vira video/quicktime", async () => {
    const qt = [...FTYP, 0x71, 0x74, 0x20, 0x20];
    const r = await validateFile(arquivo(qt, "gravacao.mov"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("video/quicktime");
  });

  it("o tipo informado pelo navegador continua prevalecendo", async () => {
    const isom = [...FTYP, 0x69, 0x73, 0x6f, 0x6d];
    const r = await validateFile(arquivo(isom, "x.mp4", "video/mp4"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("video/mp4");
  });

  it("JPEG não é confundido com MP3 — os dois começam com 0xFF", async () => {
    const r = await validateFile(arquivo([0xff, 0xd8, 0xff, 0xe0], "foto.jpg"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("image/jpeg");
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
