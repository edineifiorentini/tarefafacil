/**
 * Consultas públicas de CEP e CNPJ.
 *
 * As duas rodam NO SERVIDOR, em `/api/lookup/*`, e não no navegador. Três
 * motivos, em ordem de importância:
 *
 * 1. O IP de quem usa o sistema não precisa ir para um terceiro só porque
 *    a pessoa digitou um CEP.
 * 2. Limite de requisição por IP: com todo mundo consultando pelo servidor,
 *    o teto é do servidor e dá para colocar cache na frente.
 * 3. Se o provedor mudar (ou cair), troca-se num arquivo só.
 *
 * **Não existe consulta de CPF aqui, e não é esquecimento.** CNPJ é dado
 * público da Receita Federal. CPF não é: consultar exige bureau pago com
 * contrato e finalidade declarada, e puxar dado de pessoa física sem base
 * legal é problema de LGPD antes de ser de custo. O que o sistema faz com
 * CPF é validar o dígito verificador, em `lib/validation/document.ts`.
 */

export type CepResult = {
  zipCode: string;
  street: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

export type CnpjResult = {
  document: string;
  /** Razão social. */
  name: string;
  fantasyName: string | null;
  email: string | null;
  phone: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  /** Situação cadastral ("ATIVA", "BAIXADA"…) — vale avisar quando não é ativa. */
  status: string | null;
};

/** Deixa só os dígitos. Aceita o que a pessoa digitou com máscara. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isCep(value: string): boolean {
  return /^[0-9]{8}$/.test(onlyDigits(value));
}

export function isCnpj(value: string): boolean {
  return /^[0-9]{14}$/.test(onlyDigits(value));
}
