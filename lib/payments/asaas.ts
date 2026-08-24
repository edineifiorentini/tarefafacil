import type {
  Environment,
  PaymentProvider,
  TokenCheck,
  VerifyResult,
} from "./provider";
import { VERIFY_TIMEOUT_MS, failureFromStatus } from "./provider";

const NOME = "Asaas";

/**
 * No Asaas o ambiente é outro servidor, não um parâmetro. A chave é gerada
 * dentro de um ambiente e só vale nele — chave de sandbox na URL de produção
 * volta 401, o que é seguro, mas a mensagem "credencial recusada" mandaria a
 * pessoa gerar outra chave em vez de trocar o ambiente.
 */
const BASE: Record<Environment, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  producao: "https://api.asaas.com/v3",
};

/** Chave de homologação vem marcada; a de produção não tem esse trecho. */
const MARCA_SANDBOX = "hmlg";

type ContaAsaas = {
  name?: string;
  email?: string;
};

export const asaas: PaymentProvider = {
  id: "asaas",
  name: NOME,

  inspectToken(token: string, environment: Environment): TokenCheck {
    const limpo = token.trim();
    if (!limpo) {
      return { ok: false, message: "Cole a chave de API do Asaas" };
    }

    if (!limpo.startsWith("$aact_")) {
      return {
        ok: false,
        message: "A chave de API do Asaas começa com $aact_",
      };
    }

    const ehSandbox = limpo.includes(MARCA_SANDBOX);
    if (ehSandbox && environment === "producao") {
      return {
        ok: false,
        message:
          "Essa é a chave de homologação. Em produção ela não recebe nada — gere a chave no ambiente de produção ou mude o ambiente",
      };
    }
    if (!ehSandbox && environment === "sandbox") {
      return {
        ok: false,
        message:
          "Essa é a chave de produção. Em sandbox ela cobraria de verdade — gere a chave em sandbox ou mude o ambiente",
      };
    }

    return { ok: true };
  },

  async verify(token: string, environment: Environment): Promise<VerifyResult> {
    const formato = asaas.inspectToken(token, environment);
    if (!formato.ok) {
      return { ok: false, kind: "ambiente", message: formato.message };
    }

    let res: Response;
    try {
      res = await fetch(`${BASE[environment]}/myAccount/commercialInfo`, {
        headers: {
          access_token: token.trim(),
          // O Asaas pede identificação do integrador; sem isso algumas
          // contas caem em limitação de uso.
          "user-agent": "TarefaFacil/1.0",
        },
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

    const conta = (await res.json().catch(() => ({}))) as ContaAsaas;
    // Só nome e e-mail. A resposta traz CPF/CNPJ e endereço, e nada disso
    // tem por que atravessar para o nosso banco (§15).
    return { ok: true, label: conta.name ?? conta.email ?? "" };
  },
};
