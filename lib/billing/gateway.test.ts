import { describe, expect, it } from "vitest";

import { FakeGateway } from "./gateway";

/**
 * O gateway falso existe para o resto do módulo ser testável sem
 * credencial. Estes testes garantem que ele se comporta como um provedor
 * de verdade nos pontos que a regra de negócio observa.
 */
describe("FakeGateway", () => {
  const entrada = {
    amountCents: 9900,
    description: "TarefaFácil Pro",
    expiresInSeconds: 3600,
    reference: "ws-1/2026-09-05",
  };

  it("cobrança nasce não paga", async () => {
    const g = new FakeGateway();
    const c = await g.createPixCharge(entrada);
    const s = await g.getChargeStatus(c.providerChargeId);
    expect(s.paid).toBe(false);
    expect(s.paidAt).toBeNull();
  });

  it("cada cobrança tem identificador próprio", async () => {
    const g = new FakeGateway();
    const a = await g.createPixCharge(entrada);
    const b = await g.createPixCharge(entrada);
    expect(a.providerChargeId).not.toBe(b.providerChargeId);
  });

  it("pagar uma não paga a outra", async () => {
    const g = new FakeGateway();
    const a = await g.createPixCharge(entrada);
    const b = await g.createPixCharge(entrada);
    g.marcarComoPaga(a.providerChargeId);
    expect((await g.getChargeStatus(a.providerChargeId)).paid).toBe(true);
    expect((await g.getChargeStatus(b.providerChargeId)).paid).toBe(false);
  });

  it("o valor pago é o valor cobrado", async () => {
    const g = new FakeGateway();
    const c = await g.createPixCharge(entrada);
    g.marcarComoPaga(c.providerChargeId);
    const s = await g.getChargeStatus(c.providerChargeId);
    expect(s.paidAmountCents).toBe(9900);
  });

  it("identificador desconhecido não devolve pago", async () => {
    // Conciliação com id errado não pode liberar acesso.
    const g = new FakeGateway();
    expect((await g.getChargeStatus("nao-existe")).paid).toBe(false);
  });

  it("a expiração respeita a janela pedida", async () => {
    const g = new FakeGateway();
    const c = await g.createPixCharge({ ...entrada, expiresInSeconds: 60 });
    const daqui = c.expiresAt.getTime() - Date.now();
    expect(daqui).toBeGreaterThan(50_000);
    expect(daqui).toBeLessThanOrEqual(60_000);
  });
});
