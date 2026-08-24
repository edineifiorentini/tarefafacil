import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, secretBoxConfigured } from "./secretBox";

const CHAVE = Buffer.alloc(32, 7).toString("base64");
const original = process.env.CREDENTIAL_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = CHAVE;
});

afterEach(() => {
  if (original === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  else process.env.CREDENTIAL_ENCRYPTION_KEY = original;
});

describe("secretBox", () => {
  it("volta o mesmo texto", () => {
    const token = "APP_USR-1234567890abcdef";
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it("cifra o mesmo texto diferente a cada vez", () => {
    // IV aleatório por chamada. Sem isso, duas empresas com a mesma chave
    // teriam linhas idênticas no banco — e igualdade visível é informação.
    const a = encryptSecret("mesma coisa");
    const b = encryptSecret("mesma coisa");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("não guarda o texto claro em lugar nenhum do payload", () => {
    const cifrado = encryptSecret("APP_USR-segredo");
    expect(cifrado).not.toContain("APP_USR");
    expect(cifrado).not.toContain("segredo");
  });

  it("recusa payload adulterado", () => {
    // É o ponto do GCM: byte trocado no banco vira erro, não texto claro
    // diferente — que é como se emitiria cobrança para a conta errada.
    const cifrado = encryptSecret("APP_USR-1234");
    const partes = cifrado.split(".");
    const corpo = Buffer.from(partes[3], "base64url");
    corpo[0] ^= 0xff;
    partes[3] = corpo.toString("base64url");
    expect(() => decryptSecret(partes.join("."))).toThrow();
  });

  it("recusa chave de tamanho errado", () => {
    // Chave curta cifra, parece que funcionou, e protege muito menos do que
    // se imagina. Falhar alto é o comportamento certo.
    process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString(
      "base64"
    );
    expect(secretBoxConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow();
  });

  it("sem chave, diz que não está configurado", () => {
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(secretBoxConfigured()).toBe(false);
  });
});
