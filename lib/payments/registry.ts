import { asaas } from "./asaas";
import { mercadoPago } from "./mercadoPago";
import type { Environment, PaymentProvider, ProviderId } from "./provider";

export const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  mercado_pago: mercadoPago,
  asaas,
};

const IDS = Object.keys(PROVIDERS) as ProviderId[];
const AMBIENTES: Environment[] = ["sandbox", "producao"];

/**
 * Valida o que veio da rede antes de virar consulta.
 *
 * O `provider` chega do corpo da requisição e vai direto para o banco, onde
 * há um `check` que aceita só dois valores. Recusar aqui devolve 400 legível
 * em vez de estouro de constraint com mensagem de Postgres na tela.
 */
export function parseProviderId(valor: unknown): ProviderId | null {
  return typeof valor === "string" && (IDS as string[]).includes(valor)
    ? (valor as ProviderId)
    : null;
}

export function parseEnvironment(valor: unknown): Environment | null {
  return typeof valor === "string" && (AMBIENTES as string[]).includes(valor)
    ? (valor as Environment)
    : null;
}
