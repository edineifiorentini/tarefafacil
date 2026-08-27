import { describe, expect, it } from "vitest";

import {
  ACOES_DE_MEMBRO,
  deixariaSemDono,
  ehAcaoDeMembro,
  ehPapelAtribuivel,
  PAPEIS_ATRIBUIVEIS,
} from "./members";

describe("ehAcaoDeMembro", () => {
  it("aceita as ações do catálogo", () => {
    expect(ehAcaoDeMembro("remover")).toBe(true);
    expect(ehAcaoDeMembro("link_de_senha")).toBe(true);
  });

  it("recusa qualquer outra coisa", () => {
    expect(ehAcaoDeMembro("virar_dono")).toBe(false);
    expect(ehAcaoDeMembro(null)).toBe(false);
    expect(ehAcaoDeMembro({ acao: "remover" })).toBe(false);
  });
});

describe("ehPapelAtribuivel", () => {
  it("aceita os três papéis atribuíveis", () => {
    for (const p of PAPEIS_ATRIBUIVEIS) expect(ehPapelAtribuivel(p)).toBe(true);
  });

  it("NÃO aceita owner", () => {
    // Dono não se atribui: se define transferindo a propriedade, que rebaixa
    // o anterior no mesmo passo. Aceitar "owner" aqui criaria empresas com
    // dois donos por um select adulterado.
    expect(ehPapelAtribuivel("owner")).toBe(false);
  });

  it("recusa lixo", () => {
    expect(ehPapelAtribuivel("superadmin")).toBe(false);
    expect(ehPapelAtribuivel("")).toBe(false);
    expect(ehPapelAtribuivel(undefined)).toBe(false);
  });
});

describe("deixariaSemDono", () => {
  it("remover o único dono é bloqueado", () => {
    expect(deixariaSemDono("remover", "owner", 1)).toBe(true);
  });

  it("rebaixar o único dono é bloqueado", () => {
    expect(deixariaSemDono("alterar_papel", "owner", 1)).toBe(true);
  });

  it("com dois donos, remover um é permitido", () => {
    expect(deixariaSemDono("remover", "owner", 2)).toBe(false);
  });

  it("remover quem não é dono é sempre permitido", () => {
    expect(deixariaSemDono("remover", "admin", 1)).toBe(false);
    expect(deixariaSemDono("alterar_papel", "member", 1)).toBe(false);
  });

  it("bloquear o único dono NÃO é barrado por esta regra", () => {
    // Bloquear é da conta de login, não da associação: a empresa continua
    // tendo dono, ele é que não entra. Quem impede o abuso disso é o motivo
    // obrigatório e a auditoria, não esta trava.
    expect(deixariaSemDono("bloquear", "owner", 1)).toBe(false);
  });

  it("transferir propriedade nunca é barrado", () => {
    // É justamente a saída do beco: o único caminho para depois poder
    // remover ou rebaixar quem era dono.
    expect(deixariaSemDono("transferir_propriedade", "owner", 1)).toBe(false);
  });
});

describe("catálogo de ações de membro", () => {
  it("toda ação exige motivo", () => {
    // Nenhuma delas é corriqueira: todas mexem em acesso de alguém.
    for (const [nome, def] of Object.entries(ACOES_DE_MEMBRO)) {
      expect(def.exigeMotivo, `${nome} não exige motivo`).toBe(true);
    }
  });

  it("o link de senha avisa que nenhum e-mail é enviado", () => {
    // O projeto não tem SMTP: prometer envio seria mentir na interface.
    expect(ACOES_DE_MEMBRO.link_de_senha.consequencia).toContain("e-mail");
    expect(ACOES_DE_MEMBRO.link_de_senha.consequencia.toLowerCase()).toContain(
      "nenhum"
    );
  });

  it("bloquear avisa que o alcance é a conta, não a empresa", () => {
    expect(ACOES_DE_MEMBRO.bloquear.consequencia).toContain("NENHUMA empresa");
  });
});
