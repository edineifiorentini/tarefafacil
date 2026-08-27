// Proteção contra SSRF na entrega de webhook.
//
// O RISCO, em uma frase: a URL de destino é escolhida pelo CLIENTE, e quem
// faz a requisição é o NOSSO servidor. Sem bloqueio, alguém cadastra
// `http://169.254.169.254/latest/meta-data/` e usa o TarefaFácil como sonda
// dentro da nossa própria infraestrutura — de onde se alcança o que a
// internet não alcança.
//
// Não é hipótese: é como vazaram credenciais de nuvem em vários incidentes
// públicos, sempre pelo mesmo caminho — um recurso que aceita URL do usuário.
//
// TRÊS CAMADAS, e a terceira é a que quase todo mundo esquece:
//
// 1. Só https. http em claro entrega o corpo assinado a quem estiver no meio.
// 2. Resolver o DNS e barrar IP privado ANTES de conectar.
// 3. Repetir a checagem em CADA redirecionamento. Um destino público que
//    responde 302 para `http://127.0.0.1` contorna as duas primeiras — e é
//    também a janela do DNS rebinding, em que o nome resolve para IP público
//    na checagem e para IP interno na conexão.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type VerificacaoDeUrl =
  { ok: true; url: URL } | { ok: false; motivo: string };

/** Quantos redirecionamentos são seguidos antes de desistir. */
export const MAXIMO_DE_REDIRECIONAMENTOS = 3;

/**
 * O IP é de uso interno?
 *
 * A lista cobre o que precisa ser coberto e está escrita por extenso em vez
 * de uma expressão regular esperta: cada linha aqui é um caminho por onde já
 * saiu segredo de alguém, e quem for mexer precisa entender o que remove.
 */
export function ehIpInterno(ip: string): boolean {
  const versao = isIP(ip);
  if (versao === 0) return true; // não é IP: trata como suspeito

  if (versao === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true; // 10.0.0.0/8
    if (p[0] === 127) return true; // laço local
    if (p[0] === 0) return true; // "este host"
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16/12
    if (p[0] === 192 && p[1] === 168) return true; // 192.168/16
    if (p[0] === 169 && p[1] === 254) return true; // metadados da nuvem
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] >= 224) return true; // multicast e reservado
    return false;
  }

  // IPv6. Normalizado em minúsculas; o "::ffff:" cobre IPv4 disfarçado, que
  // é o desvio clássico de listas que só olham IPv4.
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // único local
  if (v6.startsWith("fe80")) return true; // enlace local
  if (v6.startsWith("::ffff:")) return ehIpInterno(v6.slice(7));
  return false;
}

/**
 * A URL é aceitável como destino de webhook?
 *
 * Resolve o DNS: um nome público pode apontar para IP interno, e é assim que
 * se contorna uma lista que só olha o texto da URL.
 */
export async function verificarDestino(
  bruta: string
): Promise<VerificacaoDeUrl> {
  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    return { ok: false, motivo: "URL inválida" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, motivo: "Só https é aceito" };
  }

  // Credencial na URL some no log de alguém mais cedo ou mais tarde.
  if (url.username || url.password) {
    return { ok: false, motivo: "URL não pode conter usuário e senha" };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  // Nome literalmente local, antes de gastar uma consulta de DNS.
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, motivo: "Endereço interno não é aceito" };
  }

  if (isIP(host)) {
    return ehIpInterno(host)
      ? { ok: false, motivo: "Endereço interno não é aceito" }
      : { ok: true, url };
  }

  let enderecos: { address: string }[];
  try {
    enderecos = await lookup(host, { all: true });
  } catch {
    return { ok: false, motivo: "Não foi possível resolver o endereço" };
  }

  if (enderecos.length === 0) {
    return { ok: false, motivo: "Endereço não resolve" };
  }

  // TODOS precisam ser públicos. Um nome que resolve para dois IPs, um
  // público e um interno, escolheria o interno na hora da conexão metade das
  // vezes — e passaria numa checagem que só olha o primeiro.
  for (const e of enderecos) {
    if (ehIpInterno(e.address)) {
      return { ok: false, motivo: "Endereço interno não é aceito" };
    }
  }

  return { ok: true, url };
}
