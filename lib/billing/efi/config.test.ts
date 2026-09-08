import { describe, expect, it } from "vitest";

import { lerConfigEfi } from "./config";

/**
 * A configuração é a fronteira onde um erro de digitação vira falha de rede
 * três passos depois. Cada caso aqui é uma forma de errar que já aconteceu
 * ou que custa caro.
 */

// Um DER mínimo que começa como um PKCS#12 de verdade (0x30 0x82).
const CERT_OK = Buffer.concat([
  Buffer.from([0x30, 0x82, 0x0a, 0x00]),
  Buffer.alloc(200, 1),
]).toString("base64");

const BASE = {
  EFI_CLIENT_ID: "Client_Id_abc",
  EFI_CLIENT_SECRET: "Client_Secret_xyz",
  EFI_PIX_KEY: "11111111-2222-3333-4444-555555555555",
  EFI_CERT_P12_BASE64: CERT_OK,
};

describe("configuração da EFI", () => {
  it("aceita o conjunto completo", () => {
    const r = lerConfigEfi(BASE);
    expect(r.ok).toBe(true);
  });

  it("o padrão é HOMOLOGAÇÃO — esquecer a variável nunca cobra ninguém", () => {
    const r = lerConfigEfi(BASE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.ambiente).toBe("homologacao");
      expect(r.config.baseUrl).toContain("pix-h.");
    }
  });

  it("só a palavra exata leva a produção", () => {
    for (const v of ["producao", "PRODUCAO", "Producao"]) {
      const r = lerConfigEfi({ ...BASE, EFI_AMBIENTE: v });
      expect(r.ok && r.config.ambiente).toBe("producao");
    }
    // Qualquer outra coisa cai no seguro.
    for (const v of ["prod", "production", "produção", "", "sim"]) {
      const r = lerConfigEfi({ ...BASE, EFI_AMBIENTE: v });
      expect(r.ok && r.config.ambiente).toBe("homologacao");
    }
  });

  it("diz QUAIS variáveis faltam, não 'configuração inválida'", () => {
    const r = lerConfigEfi({ EFI_CLIENT_ID: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.faltando).toContain("EFI_CLIENT_SECRET");
      expect(r.faltando).toContain("EFI_PIX_KEY");
      expect(r.faltando).toContain("EFI_CERT_P12_BASE64");
      expect(r.faltando).not.toContain("EFI_CLIENT_ID");
    }
  });

  it("pega certificado copiado pela metade", () => {
    // Base64 truncado decodifica sem erro e produz lixo. Os dois primeiros
    // bytes do DER são o que separa "colou certo" de "colou metade".
    const r = lerConfigEfi({ ...BASE, EFI_CERT_P12_BASE64: "bm9wZQ==" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("pela metade");
  });

  it("espaço em volta do valor não quebra", () => {
    // Colar do painel costuma trazer espaço ou quebra de linha junto.
    const r = lerConfigEfi({ ...BASE, EFI_CLIENT_ID: "  Client_Id_abc  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.clientId).toBe("Client_Id_abc");
  });

  it("variável presente mas vazia conta como ausente", () => {
    const r = lerConfigEfi({ ...BASE, EFI_PIX_KEY: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.faltando).toContain("EFI_PIX_KEY");
  });
});
