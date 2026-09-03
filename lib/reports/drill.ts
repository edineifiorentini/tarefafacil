// De um número do relatório para as demandas por trás dele.
//
// **Leva para a Lista, não para uma cópia dela dentro de Relatórios.** A
// Lista já sabe agrupar, ordenar, selecionar em massa, concluir e abrir o
// painel de detalhe. Reconstruir um pedaço disso aqui criaria uma segunda
// tela de gestão de demandas que envelheceria separada da primeira — e a
// pessoa que clicasse em "4 atrasadas" cairia numa tabela que não faz o que
// a tabela ao lado faz.
//
// Os nomes dos parâmetros são os mesmos de `ListFilters` de propósito: a
// URL vira a documentação do filtro.

import { JANELA_DE_ATENCAO } from "./overview";

export type Drill =
  | { tipo: "atrasadas" }
  | { tipo: "atencao" }
  | { tipo: "abertas" }
  | { tipo: "concluidas" }
  | { tipo: "setor"; sectorId: string };

export type ContextoDoDrill = {
  sectorIds: string[];
  assigneeIds: string[];
};

/**
 * O endereço da Lista para um drill, já com os filtros da tela aplicados.
 *
 * O contexto vai junto porque o número clicado é o número FILTRADO: quem
 * está vendo só o setor de Obras e clica em "4 atrasadas" quer as quatro de
 * Obras, não todas as do workspace.
 *
 * **Responsável só entra quando é um só.** `ListFilters.assigneeId` é
 * singular, e mandar o primeiro de três seria filtrar por alguém que a
 * pessoa não escolheu — pior do que não filtrar.
 */
export function urlDaLista(drill: Drill, ctx: ContextoDoDrill): string {
  const p = new URLSearchParams();

  switch (drill.tipo) {
    case "atrasadas":
      p.set("status", "atrasada");
      break;
    case "atencao":
      // Abertas com prazo dentro da janela. `dueWithinDays` aceita 7, 14 ou
      // 30; a janela do relatório é 7, então os dois falam a mesma língua.
      p.set("status", "aberta");
      p.set("prazo", String(JANELA_DE_ATENCAO));
      break;
    case "abertas":
      p.set("status", "aberta");
      break;
    case "concluidas":
      p.set("status", "concluida");
      break;
    case "setor":
      p.set("setores", drill.sectorId);
      break;
  }

  if (drill.tipo !== "setor" && ctx.sectorIds.length > 0) {
    p.set("setores", ctx.sectorIds.join(","));
  }
  if (ctx.assigneeIds.length === 1) {
    p.set("responsavel", ctx.assigneeIds[0]);
  }

  return `/lista?${p.toString()}`;
}
