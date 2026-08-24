import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra de segredo de terceiro, para o que a aplicação guarda mas não deveria
 * conseguir ler de um dump.
 *
 * O Supabase cifra em disco, e isso resolve o disco. Não resolve o resto:
 * quem obtiver a chave secreta do projeto, ou um backup, lê a tabela inteira
 * em texto claro. Para token de agenda isso é chato; para o token que emite
 * cobrança em nome do cliente, é o cliente sendo roubado com a nossa
 * credencial. Cifrando aqui, o banco guarda algo inútil sem uma chave que
 * nunca esteve dentro dele.
 *
 * AES-256-GCM: além de cifrar, autentica. Byte trocado no banco vira erro na
 * hora de abrir, não texto claro diferente — que é como se emite cobrança
 * para a conta errada.
 *
 * Formato: `v1.<iv>.<tag>.<texto cifrado>`, tudo base64url. A versão na
 * frente é o que vai permitir trocar a chave um dia sem adivinhar o que cada
 * linha guarda.
 */
const VERSAO = "v1";
const ALGORITMO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const CHAVE_BYTES = 32;

function lerChave(): Buffer {
  const bruta = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!bruta) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY ausente");
  }
  const chave = Buffer.from(bruta, "base64");
  if (chave.length !== CHAVE_BYTES) {
    // Chave curta silenciosa é pior que chave ausente: cifra, parece que
    // funcionou, e protege muito menos do que se imagina.
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY precisa ter ${CHAVE_BYTES} bytes em base64`
    );
  }
  return chave;
}

/**
 * Diz se dá para guardar segredo neste ambiente.
 *
 * Quem chama usa isto para RECUSAR a operação — nunca para cair num modo sem
 * cifra. Guardar token de cobrança em texto claro "só por enquanto" é como
 * essas coisas ficam para sempre.
 */
export function secretBoxConfigured(): boolean {
  try {
    lerChave();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): string {
  const chave = lerChave();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITMO, chave, iv);
  const cifrado = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSAO,
    iv.toString("base64url"),
    tag.toString("base64url"),
    cifrado.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const partes = payload.split(".");
  if (partes.length !== 4 || partes[0] !== VERSAO) {
    throw new Error("Segredo em formato desconhecido");
  }
  const [, ivB64, tagB64, cifradoB64] = partes;
  const decipher = createDecipheriv(
    ALGORITMO,
    lerChave(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cifradoB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
