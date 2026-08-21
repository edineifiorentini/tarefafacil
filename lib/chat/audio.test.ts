import { describe, expect, it } from "vitest";

import {
  extensionFor,
  formatDuration,
  MAX_RECORDING_MS,
  nextSpeed,
  pickRecorderMime,
  speedLabel,
  voiceFileName,
} from "./audio";

describe("formatDuration", () => {
  it("mostra segundo com dois dígitos", () => {
    expect(formatDuration(5_000)).toBe("0:05");
    expect(formatDuration(65_000)).toBe("1:05");
  });

  it("arredonda para o segundo mais próximo", () => {
    expect(formatDuration(1_400)).toBe("0:01");
    expect(formatDuration(1_600)).toBe("0:02");
  });

  it("não mostra tempo negativo", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });

  it("mostra o teto de gravação como 2:00", () => {
    expect(formatDuration(MAX_RECORDING_MS)).toBe("2:00");
  });
});

describe("velocidade", () => {
  it("cicla 1 -> 1,5 -> 2 -> 1", () => {
    expect(nextSpeed(1)).toBe(1.5);
    expect(nextSpeed(1.5)).toBe(2);
    expect(nextSpeed(2)).toBe(1);
  });

  it("escreve o rótulo com vírgula", () => {
    expect(speedLabel(1)).toBe("1x");
    expect(speedLabel(1.5)).toBe("1,5x");
    expect(speedLabel(2)).toBe("2x");
  });
});

describe("pickRecorderMime", () => {
  it("prefere webm com opus quando o navegador aceita (Chrome, Firefox)", () => {
    expect(pickRecorderMime(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("cai para mp4 no Safari, que não grava webm", () => {
    const safari = (t: string) => t === "audio/mp4";
    expect(pickRecorderMime(safari)).toBe("audio/mp4");
  });

  it("devolve undefined quando nada é aceito — grava no padrão do navegador", () => {
    expect(pickRecorderMime(() => false)).toBeUndefined();
  });
});

describe("nome do arquivo", () => {
  it("usa a extensão do formato gravado", () => {
    expect(extensionFor("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionFor("audio/mp4")).toBe("m4a");
    expect(extensionFor("audio/ogg;codecs=opus")).toBe("ogg");
    // Sem mime, o padrão do navegador é webm na maioria esmagadora.
    expect(extensionFor(undefined)).toBe("webm");
  });

  it("carimba data e hora, sem caractere que o storage recuse", () => {
    const nome = voiceFileName("audio/mp4", new Date("2026-08-21T14:35:00Z"));
    expect(nome).toBe("recado-2026-08-21-14-35.m4a");
    expect(nome).not.toMatch(/[:T]/);
  });
});
