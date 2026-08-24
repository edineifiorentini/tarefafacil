import type {
  Environment,
  PaymentProvider,
  TokenCheck,
  VerifyResult,
} from "./provider";
import { VERIFY_TIMEOUT_MS, failureFromStatus } from "./provider";

const NOME = "Mercado Pago";
const BASE = "https://api.mercadopago.com";

/**
 * No Mercado Pago o ambiente vem escrito no próprio token: `TEST-` é teste,
 * `APP_USR-` é produção. Uma conta só, dois pares de credenciais.
 *
 * É o que permite pegar o erro caro antes da rede: quem cola a chave de
 * produção com "sandbox" marcado acha que está testando e cobra de gente
 * real. O provedor não reclamaria — do ponto de vista dele a chave é válida.
 */
const PREFIXO: Record<Environment, string> = {
  sandbox: "TEST-",
  producao: "APP_USR-",
};

type UsuarioMP = {
  id?: number;
  nickname?: string;
  email?: string;
};

export const mercadoPago: PaymentProvider = {
  id: "mercado_pago",
  name: NOME,

  inspectToken(token: string, environment: Environment): TokenCheck {
    const limpo = token.trim();
    if (!limpo) {
      return { ok: false, message: "Cole o access token do Mercado Pago" };
    }

    const esperado = PREFIXO[environment];
    const outro: Environment =
      environment === "sandbox" ? "producao" : "sandbox";

    if (limpo.startsWith(PREFIXO[outro])) {
      return {
        ok: false,
        message:
          environment === "sandbox"
            ? "Esse é o token de produção (APP_USR-). Em sandbox ele cobraria de verdade — use o token de teste ou mude o ambiente"
            : "Esse é o token de teste (TEST-). Em produção ele não recebe nada — use o token de produção ou mude o ambiente",
      };
    }

    if (!limpo.startsWith(esperado)) {
      return {
        ok: false,
        message: `O access token do Mercado Pago começa com ${esperado}`,
      };
    }

    return { ok: true };
  },

  async verify(token: string, environment: Environment): Promise<VerifyResult> {
    const formato = mercadoPago.inspectToken(token, environment);
    if (!formato.ok) {
      return { ok: false, kind: "ambiente", message: formato.message };
    }

    let res: Response;
    try {
      res = await fetch(`${BASE}/users/me`, {
        headers: { authorization: `Bearer ${token.trim()}` },
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
    } catch {
      return {
        ok: false,
        kind: "indisponivel",
        message: `Não foi possível falar com o ${NOME} agora. A credencial não foi salva`,
      };
    }

    if (!res.ok) return failureFromStatus(res.status, NOME);

    const usuario = (await res.json().catch(() => ({}))) as UsuarioMP;
    // O apelido serve para a pessoa reconhecer a conta na lista. Se o
    // provedor mudar o corpo da resposta, a conexão continua válida — o
    // rótulo é conveniência, não prova.
    const label =
      usuario.nickname ?? usuario.email ?? (usuario.id ? `#${usuario.id}` : "");
    return { ok: true, label };
  },
};
