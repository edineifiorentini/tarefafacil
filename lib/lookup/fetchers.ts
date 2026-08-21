"use client";

import {
  onlyDigits,
  type CepResult,
  type CnpjResult,
} from "@/lib/lookup/types";

/**
 * Chamadas às rotas de consulta.
 *
 * Devolvem `null` em vez de lançar quando o serviço não achou ou está fora
 * do ar: preencher endereço é conveniência, e conveniência que falha não
 * pode interromper o cadastro. Quem chama mostra o aviso e a pessoa digita.
 */

export async function buscarCep(cep: string): Promise<CepResult | null> {
  const digits = onlyDigits(cep);
  const res = await fetch(`/api/lookup/cep/${digits}`);
  if (!res.ok) return null;
  return (await res.json()) as CepResult;
}

export async function buscarCnpj(cnpj: string): Promise<CnpjResult | null> {
  const digits = onlyDigits(cnpj);
  const res = await fetch(`/api/lookup/cnpj/${digits}`);
  if (!res.ok) return null;
  return (await res.json()) as CnpjResult;
}

/** "12345678" -> "12345-678". Só para mostrar; o banco guarda os dígitos. */
export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
