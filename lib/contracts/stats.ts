import type { Contract } from "@/types/database";

export type ContractStats = {
  rascunhos: number;
  enviados: number;
  assinadosAtivos: number;
  valorMensalCents: number; // "valor mensal contratado" — só contratos ativos
};

// Normaliza o valor do contrato pra equivalente mensal, conforme a
// periodicidade (spec 9.1: card "Valor mensal contratado" na listagem).
export function monthlyEquivalentCents(contract: Contract): number {
  if (!contract.amount_cents) return 0;
  switch (contract.billing_period) {
    case "trimestral":
      return Math.round(contract.amount_cents / 3);
    case "anual":
      return Math.round(contract.amount_cents / 12);
    case "unico":
      return 0; // não é receita recorrente
    case "mensal":
    default:
      return contract.amount_cents;
  }
}

export function computeContractStats(contracts: Contract[]): ContractStats {
  let rascunhos = 0;
  let enviados = 0;
  let assinadosAtivos = 0;
  let valorMensalCents = 0;

  for (const c of contracts) {
    if (c.status === "rascunho") rascunhos += 1;
    else if (c.status === "enviado") enviados += 1;
    else if (c.status === "assinado" || c.status === "ativo") assinadosAtivos += 1;

    if (c.status === "ativo") valorMensalCents += monthlyEquivalentCents(c);
  }

  return { rascunhos, enviados, assinadosAtivos, valorMensalCents };
}

// Vence em breve: ativo, com fim de vigência nos próximos `days` dias.
export function isExpiringSoon(
  contract: Contract,
  days: number,
  now: Date = new Date()
): boolean {
  if (contract.status !== "ativo" || !contract.ends_on) return false;
  const today = now.toISOString().slice(0, 10);
  const limit = new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
  return contract.ends_on >= today && contract.ends_on <= limit;
}
