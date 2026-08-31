// A regra da exclusão de cliente. Pura: sem banco, sem React.
//
// Está aqui, e não dentro do diálogo, porque não é texto — é decisão. Quando
// a exclusão é recusada, o que sobrevive e o que some: cada uma dessas
// respostas vem das chaves estrangeiras do banco, e errar qualquer uma
// significa apagar um contrato sem avisar.

export type ImpactoDaExclusao = {
  /** APAGADOS junto — `on delete cascade` (0032, 0056). */
  contratos: number;
  negociacoes: number;
  /** Sobrevivem sem o vínculo — `on delete set null` (0020, 0031). */
  tarefas: number;
  lancamentos: number;
};

export type Veredito =
  | { pode: false; motivo: "contrato"; contratos: number }
  | { pode: true; apagaJunto: number; perdemVinculo: number };

/**
 * Pode excluir?
 *
 * **Contrato bloqueia, e é regra de produto.** `contract.client_id` é
 * `on delete cascade`: apagar o cliente apaga contratos que existem
 * justamente para o dia em que alguém discordar do que foi combinado, com o
 * texto congelado no momento da assinatura.
 *
 * Excluir cliente serve para duplicata, cadastro errado, teste. Encerrar uma
 * relação que teve contrato é `status = 'encerrado'`, que já existe e
 * preserva tudo.
 *
 * Negociação do funil NÃO bloqueia, embora também seja cascata: ela é
 * registro comercial, não documento. Some avisada.
 */
export function podeExcluir(i: ImpactoDaExclusao): Veredito {
  if (i.contratos > 0) {
    return { pode: false, motivo: "contrato", contratos: i.contratos };
  }
  return {
    pode: true,
    apagaJunto: i.negociacoes,
    perdemVinculo: i.tarefas + i.lancamentos,
  };
}

/** Plural do português sem inventar caso: só as palavras que esta tela usa. */
export function pluralizar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * A frase do que sobrevive.
 *
 * Devolve null quando não há nada a dizer — uma linha "0 demandas continuam
 * no sistema" é ruído que treina a pessoa a não ler o diálogo.
 */
export function fraseDoQueSobrevive(i: ImpactoDaExclusao): string | null {
  const partes: string[] = [];
  if (i.tarefas > 0) partes.push(pluralizar(i.tarefas, "demanda", "demandas"));
  if (i.lancamentos > 0) {
    partes.push(pluralizar(i.lancamentos, "lançamento", "lançamentos"));
  }
  if (partes.length === 0) return null;

  const total = i.tarefas + i.lancamentos;
  const verbo = total === 1 ? "continua" : "continuam";
  return `${partes.join(" e ")} ${verbo} no sistema, sem o vínculo com este cliente.`;
}
