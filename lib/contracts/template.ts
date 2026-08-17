import { formatCentsBRL } from "@/lib/finance/money";
import {
  documentLabel,
  maskCNPJ,
  maskCPF,
  maskDocument,
} from "@/lib/validation/document";
import type { Client, Contract, WorkspaceProfile } from "@/types/database";

/**
 * Motor de modelos de contrato.
 *
 * O corpo do modelo é TEXTO com marcadores, nunca HTML. Essa é uma decisão
 * de segurança: o spec pede "sanitizar HTML e impedir scripts" na prévia e
 * no PDF, e não aceitar HTML elimina a classe inteira de risco em vez de
 * tentar filtrá-la. O render devolve blocos tipados que a UI monta com
 * elementos React — nunca dangerouslySetInnerHTML.
 *
 * Sintaxe:
 *   {{cliente.nome}}          variável
 *   {{#se cliente.endereco}}  bloco só aparece se a variável tiver valor
 *   ...
 *   {{/se}}
 *   ## Título                 vira um cabeçalho
 *   linha em branco           separa parágrafos
 */

export type TemplateContext = Record<string, string>;

export type VariableGroup = "contrato" | "cliente" | "contratado" | "data";

export type VariableSpec = {
  key: string;
  group: VariableGroup;
  label: string;
};

/** Catálogo do que o editor oferece — variável fora daqui é erro visível. */
export const CONTRACT_VARIABLES: VariableSpec[] = [
  { key: "contrato.numero", group: "contrato", label: "Número" },
  { key: "contrato.titulo", group: "contrato", label: "Título do serviço" },
  { key: "contrato.descricao", group: "contrato", label: "Descrição / escopo" },
  { key: "contrato.valor", group: "contrato", label: "Valor" },
  { key: "contrato.periodicidade", group: "contrato", label: "Periodicidade" },
  {
    key: "contrato.forma_pagamento",
    group: "contrato",
    label: "Forma de pagamento",
  },
  { key: "contrato.emissao", group: "contrato", label: "Data de emissão" },
  { key: "contrato.inicio", group: "contrato", label: "Início da vigência" },
  { key: "contrato.fim", group: "contrato", label: "Fim da vigência" },
  {
    key: "contrato.aviso_renovacao",
    group: "contrato",
    label: "Dias de aviso prévio",
  },

  { key: "cliente.nome", group: "cliente", label: "Razão social / nome" },
  { key: "cliente.fantasia", group: "cliente", label: "Nome fantasia" },
  { key: "cliente.documento", group: "cliente", label: "CPF/CNPJ" },
  {
    key: "cliente.documento_rotulo",
    group: "cliente",
    label: 'Rótulo ("CPF" ou "CNPJ")',
  },
  { key: "cliente.endereco", group: "cliente", label: "Endereço" },
  { key: "cliente.email", group: "cliente", label: "E-mail" },
  { key: "cliente.telefone", group: "cliente", label: "Telefone" },
  {
    key: "cliente.representante",
    group: "cliente",
    label: "Representante legal",
  },
  {
    key: "cliente.representante_documento",
    group: "cliente",
    label: "CPF do representante",
  },

  { key: "contratado.nome", group: "contratado", label: "Razão social" },
  { key: "contratado.documento", group: "contratado", label: "CNPJ" },
  { key: "contratado.ie", group: "contratado", label: "Inscrição estadual" },
  { key: "contratado.endereco", group: "contratado", label: "Endereço" },
  { key: "contratado.email", group: "contratado", label: "E-mail" },
  { key: "contratado.telefone", group: "contratado", label: "Telefone" },
  {
    key: "contratado.representante",
    group: "contratado",
    label: "Quem assina",
  },
  {
    key: "contratado.representante_cargo",
    group: "contratado",
    label: "Cargo de quem assina",
  },
  {
    key: "contratado.representante_documento",
    group: "contratado",
    label: "CPF de quem assina",
  },

  { key: "data.hoje", group: "data", label: "Data de hoje" },
];

const VARIABLE_KEYS = new Set(CONTRACT_VARIABLES.map((v) => v.key));

const BILLING_LABEL: Record<string, string> = {
  unico: "pagamento único",
  mensal: "mensal",
  trimestral: "trimestral",
  anual: "anual",
};

function formatDate(value: string | null): string {
  if (!value) return "";
  return value.split("-").reverse().join("/");
}

/** Monta o contexto a partir dos dados reais das duas partes. */
export function buildTemplateContext(input: {
  contract: Contract;
  client: Client | null;
  org: WorkspaceProfile | null;
  today: string;
}): TemplateContext {
  const { contract, client, org, today } = input;

  return {
    "contrato.numero": contract.number ?? "",
    "contrato.titulo": contract.title,
    "contrato.descricao": contract.description ?? "",
    "contrato.valor": contract.amount_cents
      ? formatCentsBRL(contract.amount_cents)
      : "",
    "contrato.periodicidade":
      BILLING_LABEL[contract.billing_period ?? ""] ?? "",
    "contrato.forma_pagamento": contract.payment_method ?? "",
    "contrato.emissao": formatDate(contract.issued_on),
    "contrato.inicio": formatDate(contract.starts_on),
    "contrato.fim": formatDate(contract.ends_on),
    "contrato.aviso_renovacao": contract.renew_notice_days
      ? String(contract.renew_notice_days)
      : "",

    "cliente.nome": client?.name ?? "",
    "cliente.fantasia": client?.fantasy_name ?? "",
    // Documento sempre formatado: o banco guarda como foi digitado, mas num
    // contrato "07270498710" não é um CPF, é um número solto.
    "cliente.documento": client?.document
      ? maskDocument(client.document, client.type)
      : "",
    "cliente.documento_rotulo": client ? documentLabel(client.type) : "",
    "cliente.endereco": client?.address ?? "",
    "cliente.email": client?.email ?? "",
    "cliente.telefone": client?.phone ?? "",
    "cliente.representante": client?.representative_name ?? "",
    "cliente.representante_documento": client?.representative_document
      ? maskCPF(client.representative_document)
      : "",

    "contratado.nome": org?.legal_name ?? "",
    "contratado.documento": org?.document ? maskCNPJ(org.document) : "",
    "contratado.ie": org?.state_registration ?? "",
    "contratado.endereco": org?.address ?? "",
    "contratado.email": org?.email ?? "",
    "contratado.telefone": org?.phone ?? "",
    "contratado.representante": org?.representative_name ?? "",
    "contratado.representante_cargo": org?.representative_role ?? "",
    "contratado.representante_documento": org?.representative_document
      ? maskCPF(org.representative_document)
      : "",

    "data.hoje": today,
  };
}

/**
 * Resolve os blocos condicionais. Não aninha de propósito: aninhamento em
 * editor de texto simples gera mais erro do usuário do que utilidade.
 */
export function resolveConditionals(
  body: string,
  ctx: TemplateContext
): string {
  const block = /\{\{#se\s+([\w.]+)\}\}([\s\S]*?)\{\{\/se\}\}/g;
  return body.replace(block, (_match, key: string, inner: string) => {
    const value = ctx[key];
    return value && value.trim() !== "" ? inner : "";
  });
}

/**
 * Troca as variáveis. Chave desconhecida vira um marcador VISÍVEL — sumir
 * em silêncio esconderia um erro de digitação até o contrato ficar pronto.
 */
export function substituteVariables(
  body: string,
  ctx: TemplateContext
): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    if (!VARIABLE_KEYS.has(key)) return `[[variável desconhecida: ${key}]]`;
    return ctx[key] ?? "";
  });
}

export type RenderedBlock =
  { kind: "heading"; text: string } | { kind: "paragraph"; text: string };

/** Texto resolvido -> blocos tipados. A UI monta os elementos. */
export function toBlocks(text: string): RenderedBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk !== "")
    .map((chunk) =>
      chunk.startsWith("##")
        ? { kind: "heading" as const, text: chunk.replace(/^#+\s*/, "").trim() }
        : { kind: "paragraph" as const, text: chunk }
    );
}

/** Pipeline completo: condicionais -> variáveis -> blocos. */
export function renderTemplate(
  body: string,
  ctx: TemplateContext
): RenderedBlock[] {
  return toBlocks(substituteVariables(resolveConditionals(body, ctx), ctx));
}

/** Variáveis citadas no corpo que não existem no catálogo. */
export function unknownVariables(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    const key = match[1];
    if (!VARIABLE_KEYS.has(key)) found.add(key);
  }
  return [...found];
}

/** Modelo inicial sugerido — ponto de partida editável. */
export const DEFAULT_TEMPLATE_BODY = `## Partes

{{cliente.nome}}, inscrito sob o {{cliente.documento_rotulo}} {{cliente.documento}}{{#se cliente.endereco}}, com endereço em {{cliente.endereco}}{{/se}}, doravante denominado CONTRATANTE.

{{contratado.nome}}, inscrito sob o CNPJ {{contratado.documento}}{{#se contratado.endereco}}, com endereço em {{contratado.endereco}}{{/se}}, doravante denominado CONTRATADO.

## Objeto

O presente contrato tem por objeto a prestação dos serviços de {{contrato.titulo}}.

{{#se contrato.descricao}}{{contrato.descricao}}{{/se}}

## Vigência

O contrato vigora de {{contrato.inicio}} a {{contrato.fim}}.

{{#se contrato.aviso_renovacao}}A renovação é automática, salvo manifestação de qualquer das partes com {{contrato.aviso_renovacao}} dias de antecedência.{{/se}}

## Honorários

Pelos serviços, o CONTRATANTE pagará ao CONTRATADO o valor de {{contrato.valor}}, em periodicidade {{contrato.periodicidade}}{{#se contrato.forma_pagamento}}, por {{contrato.forma_pagamento}}{{/se}}.

## Foro

As partes elegem o foro da comarca do CONTRATADO para dirimir dúvidas oriundas deste contrato.`;
