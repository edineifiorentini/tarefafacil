import { describe, expect, it } from "vitest";

import {
  LIMITES,
  descreverCarencia,
  POLITICA_PADRAO,
  descreverTeste,
  podeSairDaAuditoria,
  validarPolitica,
} from "./politica";

const VALIDO = {
  cadastrosAbertos: true,
  diasDeTeste: 7,
  assentosIniciais: 5,
  diasDeAuditoria: 365,
  diasDeCarencia: 5,
};

describe("validação da política", () => {
  it("aceita o padrão", () => {
    const r = validarPolitica(VALIDO);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toEqual(POLITICA_PADRAO);
  });

  it("recusa envio que não é objeto", () => {
    expect(validarPolitica(null).ok).toBe(false);
    expect(validarPolitica("7").ok).toBe(false);
  });

  it("recusa número quebrado — assento e meio não existe", () => {
    const r = validarPolitica({ ...VALIDO, assentosIniciais: 5.5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("inteiro");
  });

  it("recusa texto onde precisa de número", () => {
    expect(validarPolitica({ ...VALIDO, diasDeTeste: "7" }).ok).toBe(false);
  });

  it("aceita zero dia de teste — é 'sem teste', não erro", () => {
    const r = validarPolitica({ ...VALIDO, diasDeTeste: 0 });
    expect(r.ok).toBe(true);
  });

  it("recusa zero assento: empresa que nasce sem lugar para ninguém", () => {
    const r = validarPolitica({ ...VALIDO, assentosIniciais: 0 });
    expect(r.ok).toBe(false);
  });

  it("recusa auditoria curta demais para responder alguma coisa", () => {
    const r = validarPolitica({ ...VALIDO, diasDeAuditoria: 29 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("30");
  });

  it("as bordas exatas entram", () => {
    for (const [campo, { min, max }] of Object.entries(LIMITES)) {
      expect(validarPolitica({ ...VALIDO, [campo]: min }).ok).toBe(true);
      expect(validarPolitica({ ...VALIDO, [campo]: max }).ok).toBe(true);
      expect(validarPolitica({ ...VALIDO, [campo]: min - 1 }).ok).toBe(false);
      expect(validarPolitica({ ...VALIDO, [campo]: max + 1 }).ok).toBe(false);
    }
  });

  it("o estado dos cadastros precisa ser booleano de verdade", () => {
    // "false" como texto é o clássico que passa por engano e fecha o
    // cadastro de todo mundo — ou o abre.
    expect(validarPolitica({ ...VALIDO, cadastrosAbertos: "false" }).ok).toBe(
      false
    );
  });

  it("a mensagem diz qual campo corrigir", () => {
    const r = validarPolitica({ ...VALIDO, diasDeTeste: 999 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("dias de teste");
  });
});

describe("retenção da auditoria", () => {
  const AGORA = new Date("2026-09-08T12:00:00Z");
  const diasAtras = (n: number) =>
    new Date(AGORA.getTime() - n * 86_400_000).toISOString();

  it("sai depois do prazo", () => {
    expect(podeSairDaAuditoria(diasAtras(366), 365, AGORA)).toBe(true);
  });

  it("fica dentro do prazo", () => {
    expect(podeSairDaAuditoria(diasAtras(364), 365, AGORA)).toBe(false);
  });

  it("a borda exata fica — apagar um dia a mais apaga a resposta de quem foi conferir", () => {
    expect(podeSairDaAuditoria(diasAtras(365), 365, AGORA)).toBe(false);
  });

  it("linha de hoje nunca sai", () => {
    expect(podeSairDaAuditoria(AGORA.toISOString(), 30, AGORA)).toBe(false);
  });
});

describe("texto do campo de teste", () => {
  it("zero dia diz que não há teste, em vez de 'nasce com 0 dias'", () => {
    expect(descreverTeste(0)).toContain("Sem período de teste");
  });

  it("um dia não vira '1 dias'", () => {
    expect(descreverTeste(1)).toContain("1 dia de teste");
  });

  it("diz que a contagem NÃO corta acesso", () => {
    // É a promessa que a tela não pode fazer: a 0060 decidiu que o corte
    // mora em access_expires_at, e escrever o contrário aqui enganaria
    // quem administra.
    expect(descreverTeste(7)).toContain("não corta o acesso");
  });
});

describe("tolerância de pagamento", () => {
  it("aceita zero — é escolha válida, ainda que perigosa", () => {
    expect(validarPolitica({ ...VALIDO, diasDeCarencia: 0 }).ok).toBe(true);
  });

  it("recusa acima de 60: deixa de ser tolerância e vira gratuidade", () => {
    const r = validarPolitica({ ...VALIDO, diasDeCarencia: 61 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("tolerância");
  });

  it("o texto do zero avisa que não há folga nenhuma", () => {
    // Errado para menos corta quem pagou no dia, e quem foi cortado
    // injustamente não volta. A tela precisa dizer isso antes.
    expect(descreverCarencia(0)).toContain("mesmo dia do vencimento");
  });

  it("um dia não vira '1 dias'", () => {
    expect(descreverCarencia(1)).toContain("1 dia depois");
  });
});
