import { describe, expect, it } from "vitest";

import type { Contract } from "@/types/database";

import { computeContractStats, isExpiringSoon, monthlyEquivalentCents } from "./stats";

const NOW = new Date("2026-08-14T12:00:00Z");

function contract(partial: Partial<Contract>): Contract {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    number: null,
    client_id: "cli-1",
    responsible_id: null,
    title: "Contrato",
    description: null,
    status: "rascunho",
    issued_on: null,
    starts_on: null,
    ends_on: null,
    auto_renew: false,
    renew_notice_days: null,
    amount_cents: 120000,
    billing_period: "mensal",
    payment_method: null,
    notes: null,
    signed_at: null,
    signed_document_url: null,
    created_by: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...partial,
  } as Contract;
}

describe("monthlyEquivalentCents", () => {
  it("normaliza trimestral e anual pra equivalente mensal", () => {
    expect(monthlyEquivalentCents(contract({ amount_cents: 300000, billing_period: "trimestral" }))).toBe(100000);
    expect(monthlyEquivalentCents(contract({ amount_cents: 1200000, billing_period: "anual" }))).toBe(100000);
    expect(monthlyEquivalentCents(contract({ amount_cents: 500000, billing_period: "unico" }))).toBe(0);
    expect(monthlyEquivalentCents(contract({ amount_cents: 150000, billing_period: "mensal" }))).toBe(150000);
  });
});

describe("computeContractStats", () => {
  it("conta por status e soma valor mensal só dos ativos", () => {
    const contracts = [
      contract({ status: "rascunho" }),
      contract({ status: "rascunho" }),
      contract({ status: "enviado" }),
      contract({ status: "assinado" }),
      contract({ status: "ativo", amount_cents: 200000, billing_period: "mensal" }),
      contract({ status: "ativo", amount_cents: 300000, billing_period: "trimestral" }), // 100000/mês
      contract({ status: "cancelado", amount_cents: 999999 }),
    ];
    const s = computeContractStats(contracts);
    expect(s.rascunhos).toBe(2);
    expect(s.enviados).toBe(1);
    expect(s.assinadosAtivos).toBe(3); // assinado + 2 ativos
    expect(s.valorMensalCents).toBe(300000); // 200000 + 100000
  });
});

describe("isExpiringSoon", () => {
  it("só considera ativo com vigência terminando na janela", () => {
    expect(
      isExpiringSoon(contract({ status: "ativo", ends_on: "2026-08-20" }), 30, NOW)
    ).toBe(true);
    expect(
      isExpiringSoon(contract({ status: "ativo", ends_on: "2026-12-01" }), 30, NOW)
    ).toBe(false);
    expect(
      isExpiringSoon(contract({ status: "rascunho", ends_on: "2026-08-20" }), 30, NOW)
    ).toBe(false);
  });
});
