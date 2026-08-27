// Geração e conferência de chave de API. Puro — sem banco, sem rede.
//
// Separado do armazenamento para poder ser testado sozinho: é o arquivo onde
// um erro custa caro e não aparece em teste de tela.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Prefixo fixo de toda chave.
 *
 * Serve para duas coisas concretas: quem vê a string num log reconhece de
 * onde veio, e varredores de segredo em repositório (GitHub, GitLab) podem
 * ser ensinados a procurar por este padrão. Chave sem marca só é descoberta
 * quando alguém já usou.
 */
export const PREFIXO = "tf_";

/** Bytes de aleatoriedade. 32 = 256 bits, o mesmo de uma chave AES. */
const BYTES = 32;

/** Quantos caracteres ficam visíveis na tela e no banco, em claro. */
const TAMANHO_DO_PREFIXO = PREFIXO.length + 8;

export type ChaveGerada = {
  /** O valor completo. Existe só neste instante — nunca é guardado. */
  valor: string;
  /** O que vai para o banco. */
  hash: string;
  /** O começo, para a pessoa reconhecer depois. */
  prefixo: string;
};

export function gerarChave(): ChaveGerada {
  // base64url: sem "+", "/" nem "=", então a chave passa por URL, cabeçalho
  // e variável de ambiente sem ninguém precisar escapar nada.
  const valor = PREFIXO + randomBytes(BYTES).toString("base64url");
  return {
    valor,
    hash: hashDeChave(valor),
    prefixo: prefixoDe(valor),
  };
}

/**
 * SHA-256 em hex.
 *
 * Determinístico de propósito: a autenticação precisa achar a linha pelo
 * hash num índice. Hash com sal (bcrypt, argon) obrigaria a varrer todas as
 * chaves de todas as empresas a cada requisição — e não protege nada aqui,
 * porque a entrada tem 256 bits de aleatoriedade e não existe dicionário
 * para ela.
 */
export function hashDeChave(valor: string): string {
  return createHash("sha256").update(valor, "utf8").digest("hex");
}

export function prefixoDe(valor: string): string {
  return valor.slice(0, TAMANHO_DO_PREFIXO);
}

/** Parece uma chave nossa? Filtro barato antes de ir ao banco. */
export function pareceChave(valor: string): boolean {
  if (!valor.startsWith(PREFIXO)) return false;
  const corpo = valor.slice(PREFIXO.length);
  // 32 bytes em base64url dão 43 caracteres, sem preenchimento.
  return /^[A-Za-z0-9_-]{43}$/.test(corpo);
}

/**
 * Compara dois hashes sem vazar por tempo.
 *
 * O hash não é secreto do mesmo jeito que a chave, mas comparar hash com
 * `===` numa autenticação é o hábito que, no arquivo seguinte, vira
 * comparação de segredo com `===`.
 */
export function hashConfere(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * Extrai a chave do cabeçalho `Authorization`.
 *
 * Aceita `Bearer tf_...` e a chave crua. Aceitar as duas formas evita a
 * classe de chamado mais comum de API nova — alguém que colou a chave sem o
 * "Bearer" e recebeu 401 sem explicação.
 */
export function chaveDoCabecalho(
  cabecalho: string | null | undefined
): string | null {
  if (!cabecalho) return null;
  const limpo = cabecalho.trim().replace(/^Bearer\s+/i, "");
  return pareceChave(limpo) ? limpo : null;
}
