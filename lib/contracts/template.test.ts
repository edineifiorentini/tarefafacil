import { describe, expect, it } from "vitest";

import type { Client, Contract, WorkspaceProfile } from "@/types/database";

import {
  DEFAULT_TEMPLATE_BODY,
  buildTemplateContext,
  renderTemplate,
  resolveConditionals,
  substituteVariables,
  toBlocks,
  unknownVariables,
} from "./template";

function contract(partial: Partial<Contract> = {}): Contract {
  return {
    id: "c1",
    workspace_id: "ws",
    number: "CT-001",
    client_id: "cli-1",
    responsible_id: null,
    title: "Manutenção de site",
    description: "Atualizações mensais",
    status: "rascunho",
    issued_on: "2026-08-01",
    starts_on: "2026-09-01",
    ends_on: "2026-12-01",
    auto_renew: false,
    renew_notice_days: null,
    amount_cents: 150000,
    billing_period: "mensal",
    payment_method: "Pix",
    notes: null,
    signed_at: null,
    signed_document_url: null,
    created_by: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...partial,
  } as Contract;
}

function client(partial: Partial<Client> = {}): Client {
  return {
    id: "cli-1",
    workspace_id: "ws",
    type: "pj",
    name: "ACME Ltda",
    fantasy_name: "ACME",
    document: "11.222.333/0001-81",
    email: "contato@acme.com",
    phone: "11 99999-0000",
    status: "ativo",
    entry_date: null,
    notes: null,
    address: "Rua A, 100 — São Paulo/SP",
    representative_name: "Maria Souza",
    representative_document: "529.982.247-25",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  } as Client;
}

function org(partial: Partial<WorkspaceProfile> = {}): WorkspaceProfile {
  return {
    workspace_id: "ws",
    legal_name: "Estúdio X Ltda",
    document: "04.252.011/0001-10",
    state_registration: "Isento",
    address: "Av. B, 200",
    email: "financeiro@estudiox.com",
    phone: "11 98888-0000",
    representative_name: "João Lima",
    representative_document: "111.444.777-35",
    representative_role: "Sócio-administrador",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  } as WorkspaceProfile;
}

const ctx = buildTemplateContext({
  contract: contract(),
  client: client(),
  org: org(),
  today: "15/08/2026",
});

/** O Intl usa espaço não-quebrável depois do "R$"; normaliza para comparar. */
function normalizeSpaces(value: string): string {
  return value.replace(/ /g, " ");
}

describe("buildTemplateContext", () => {
  it("formata valor, datas e periodicidade para leitura humana", () => {
    expect(normalizeSpaces(ctx["contrato.valor"])).toBe("R$ 1.500,00");
    expect(ctx["contrato.inicio"]).toBe("01/09/2026");
    expect(ctx["contrato.periodicidade"]).toBe("mensal");
  });

  it("escolhe o rótulo do documento pelo tipo do cliente", () => {
    expect(ctx["cliente.documento_rotulo"]).toBe("CNPJ");
    const pf = buildTemplateContext({
      contract: contract(),
      client: client({ type: "pf" }),
      org: org(),
      today: "15/08/2026",
    });
    expect(pf["cliente.documento_rotulo"]).toBe("CPF");
  });

  it("formata documento guardado só com dígitos", () => {
    // O banco guarda o que foi digitado; num contrato "07270498710" não é um
    // CPF, é um número solto.
    const cru = buildTemplateContext({
      contract: contract(),
      client: client({ type: "pf", document: "07270498710" }),
      org: org({ document: "04252011000110" }),
      today: "15/08/2026",
    });
    expect(cru["cliente.documento"]).toBe("072.704.987-10");
    expect(cru["contratado.documento"]).toBe("04.252.011/0001-10");
  });

  it("documento já formatado não é formatado duas vezes", () => {
    expect(ctx["cliente.documento"]).toBe("11.222.333/0001-81");
  });

  it("partes ausentes viram string vazia, não 'undefined'", () => {
    const semDados = buildTemplateContext({
      contract: contract(),
      client: null,
      org: null,
      today: "15/08/2026",
    });
    expect(semDados["cliente.nome"]).toBe("");
    expect(semDados["contratado.nome"]).toBe("");
  });
});

describe("substituteVariables", () => {
  it("troca variável conhecida pelo valor", () => {
    expect(substituteVariables("Olá {{cliente.nome}}", ctx)).toBe(
      "Olá ACME Ltda"
    );
  });

  it("tolera espaços dentro das chaves", () => {
    expect(substituteVariables("{{ cliente.nome }}", ctx)).toBe("ACME Ltda");
  });

  it("variável desconhecida vira marcador visível, não some", () => {
    expect(substituteVariables("X {{cliente.inventada}}", ctx)).toBe(
      "X [[variável desconhecida: cliente.inventada]]"
    );
  });
});

describe("resolveConditionals", () => {
  it("mantém o bloco quando a variável tem valor", () => {
    const out = resolveConditionals("A{{#se cliente.endereco}}B{{/se}}C", ctx);
    expect(out).toBe("ABC");
  });

  it("remove o bloco quando a variável está vazia", () => {
    const vazio = buildTemplateContext({
      contract: contract(),
      client: client({ address: null }),
      org: org(),
      today: "15/08/2026",
    });
    expect(
      resolveConditionals("A{{#se cliente.endereco}}B{{/se}}C", vazio)
    ).toBe("AC");
  });

  it("resolve vários blocos independentes", () => {
    const out = resolveConditionals(
      "{{#se cliente.nome}}1{{/se}}{{#se contrato.numero}}2{{/se}}",
      ctx
    );
    expect(out).toBe("12");
  });
});

describe("toBlocks", () => {
  it("separa parágrafos por linha em branco e reconhece título", () => {
    const blocks = toBlocks("## Objeto\n\nPrimeiro.\n\nSegundo.");
    expect(blocks).toEqual([
      { kind: "heading", text: "Objeto" },
      { kind: "paragraph", text: "Primeiro." },
      { kind: "paragraph", text: "Segundo." },
    ]);
  });

  it("descarta blocos vazios deixados por condicional removida", () => {
    expect(toBlocks("A\n\n\n\nB")).toHaveLength(2);
  });
});

describe("renderTemplate", () => {
  it("resolve condicional antes de trocar variável", () => {
    const blocks = renderTemplate(
      "{{#se cliente.fantasia}}Fantasia: {{cliente.fantasia}}{{/se}}",
      ctx
    );
    expect(blocks).toEqual([{ kind: "paragraph", text: "Fantasia: ACME" }]);
  });

  it("o modelo padrão renderiza sem deixar marcador de erro", () => {
    const blocks = renderTemplate(DEFAULT_TEMPLATE_BODY, ctx);
    const texto = blocks.map((b) => b.text).join("\n");
    expect(texto).not.toContain("variável desconhecida");
    expect(texto).not.toContain("{{");
    expect(texto).toContain("ACME Ltda");
    expect(texto).toContain("Estúdio X Ltda");
  });

  it("nunca devolve HTML — o texto sai cru para a UI montar", () => {
    const blocks = renderTemplate("<script>alert(1)</script>", ctx);
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      text: "<script>alert(1)</script>",
    });
  });
});

describe("unknownVariables", () => {
  it("lista só o que não existe no catálogo", () => {
    expect(
      unknownVariables("{{cliente.nome}} {{foo.bar}} {{foo.bar}}")
    ).toEqual(["foo.bar"]);
  });

  it("modelo padrão não tem variável inválida", () => {
    expect(unknownVariables(DEFAULT_TEMPLATE_BODY)).toEqual([]);
  });
});
