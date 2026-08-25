import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Marcador de acesso de suporte, assinado.
 *
 * O cookie precisa ser **inforjável** porque é ele que faz a faixa aparecer
 * e que o proxy usa para derrubar a sessão no vencimento. Se desse para
 * escrever um à mão, daria para esconder a faixa — e acesso de suporte
 * invisível é o oposto do que esta função existe para garantir.
 *
 * `SUPPORT_ACCESS_SECRET` é o segredo que o dono pediu no `.env`. Ele não é
 * a credencial que entra — quem autoriza é estar em `PLATFORM_ADMIN_EMAILS`
 * — mas sem ele o recurso não existe. São duas coisas independentes: um
 * e-mail de admin vazado não basta, e o segredo sozinho também não.
 */
const COOKIE = "tf_support";

export type SupportClaim = {
  /** Linha em `support_session`, para encerrar e auditar. */
  sessionId: string;
  workspaceId: string;
  adminEmail: string;
  /** Epoch em segundos. */
  exp: number;
};

export function supportConfigured(): boolean {
  return (process.env.SUPPORT_ACCESS_SECRET ?? "").length >= 16;
}

function assinar(payload: string): string {
  const secret = process.env.SUPPORT_ACCESS_SECRET;
  if (!secret) throw new Error("SUPPORT_ACCESS_SECRET ausente");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSupportCookie(claim: SupportClaim): string {
  const payload = Buffer.from(JSON.stringify(claim)).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

/**
 * Lê e confere. Devolve null para qualquer coisa fora do esperado —
 * assinatura errada, formato estranho ou prazo vencido.
 */
export function readSupportCookie(
  raw: string | undefined
): SupportClaim | null {
  if (!raw || !supportConfigured()) return null;

  const [payload, assinatura] = raw.split(".");
  if (!payload || !assinatura) return null;

  let esperada: string;
  try {
    esperada = assinar(payload);
  } catch {
    return null;
  }

  // Comparação em tempo constante: comparar com === vaza, pelo tempo, quanto
  // do prefixo estava certo, e isso é o suficiente para forjar por tentativa.
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let claim: SupportClaim;
  try {
    claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof claim.exp !== "number" || claim.exp * 1000 <= Date.now()) {
    return null;
  }
  return claim;
}

export const SUPPORT_COOKIE = COOKIE;

/** Prazo de uma sessão de suporte. Curto de propósito: é visita, não mudança. */
export const SUPPORT_TTL_MINUTES = 60;
