import "server-only";

/**
 * As credenciais da EFI, lidas do ambiente e conferidas antes do uso.
 *
 * **Nada aqui aceita valor pela metade.** Credencial incompleta que passa
 * adiante falha lá na frente, no meio de uma cobrança, com erro de rede em
 * vez de erro de configuração — e aí alguém perde uma tarde procurando no
 * lugar errado.
 *
 * O certificado vem em base64 porque variável de ambiente não guarda
 * binário. O `.p12` é a identidade que assina cobrança na sua conta: ele
 * nunca entra no repositório, nunca aparece em log, e o `.gitignore` do
 * projeto barra a extensão inteira.
 */

export type AmbienteEfi = "homologacao" | "producao";

export type EfiConfig = {
  clientId: string;
  clientSecret: string;
  /** Chave Pix que RECEBE. Da conta, não da aplicação. */
  chavePix: string;
  /** O `.p12` já decodificado. */
  certificado: Buffer;
  ambiente: AmbienteEfi;
  /** Base da API Pix, decidida pelo ambiente. */
  baseUrl: string;
};

/**
 * Os dois endereços da API Pix.
 *
 * O `-h` de homologação não é detalhe cosmético: é o que separa uma
 * cobrança de teste de uma cobrança que uma pessoa real pode pagar.
 */
const BASE = {
  homologacao: "https://pix-h.api.efipay.com.br",
  producao: "https://pix.api.efipay.com.br",
} as const;

export type ResultadoDaConfig =
  | { ok: true; config: EfiConfig }
  | { ok: false; faltando: string[]; motivo: string };

function limpo(v: string | undefined): string {
  return (v ?? "").trim();
}

/**
 * Monta a configuração, ou diz exatamente o que falta.
 *
 * Devolve a lista de variáveis ausentes em vez de uma frase genérica: quem
 * está configurando precisa saber qual das quatro esqueceu, e o nome exato
 * é o que ele vai colar no painel.
 */
export function lerConfigEfi(
  env: Record<string, string | undefined> = process.env
): ResultadoDaConfig {
  const clientId = limpo(env.EFI_CLIENT_ID);
  const clientSecret = limpo(env.EFI_CLIENT_SECRET);
  const chavePix = limpo(env.EFI_PIX_KEY);
  const certB64 = limpo(env.EFI_CERT_P12_BASE64);

  const faltando: string[] = [];
  if (!clientId) faltando.push("EFI_CLIENT_ID");
  if (!clientSecret) faltando.push("EFI_CLIENT_SECRET");
  if (!chavePix) faltando.push("EFI_PIX_KEY");
  if (!certB64) faltando.push("EFI_CERT_P12_BASE64");

  if (faltando.length > 0) {
    return {
      ok: false,
      faltando,
      motivo: `Faltam variáveis de ambiente da EFI: ${faltando.join(", ")}.`,
    };
  }

  const certificado = Buffer.from(certB64, "base64");

  // Um `.p12` é DER, e todo DER começa com uma sequência: 0x30 0x82. Base64
  // truncado na cópia decodifica sem erro e produz lixo — este par de bytes
  // é o que separa "colou certo" de "colou pela metade".
  if (
    certificado.length < 100 ||
    certificado[0] !== 0x30 ||
    certificado[1] !== 0x82
  ) {
    return {
      ok: false,
      faltando: ["EFI_CERT_P12_BASE64"],
      motivo:
        "EFI_CERT_P12_BASE64 não decodifica para um certificado PKCS#12. Provavelmente foi copiado pela metade.",
    };
  }

  // O padrão é homologação, e é de propósito: esquecer a variável leva ao
  // ambiente que não cobra ninguém, nunca ao que cobra.
  const bruto = limpo(env.EFI_AMBIENTE).toLowerCase();
  const ambiente: AmbienteEfi = bruto === "producao" ? "producao" : "homologacao";

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      chavePix,
      certificado,
      ambiente,
      baseUrl: BASE[ambiente],
    },
  };
}

/** Resumo seguro para log e diagnóstico. NUNCA inclui valor de credencial. */
export function descreverConfig(c: EfiConfig): Record<string, string | number> {
  return {
    ambiente: c.ambiente,
    baseUrl: c.baseUrl,
    clientIdTamanho: c.clientId.length,
    certificadoBytes: c.certificado.length,
    // A chave Pix aparece só pelo formato: ela vai no QR code que o cliente
    // vê, mas não precisa estar no nosso log.
    chavePixFormato: /^[0-9a-f-]{36}$/i.test(c.chavePix)
      ? "aleatoria"
      : c.chavePix.includes("@")
        ? "email"
        : "outra",
  };
}
