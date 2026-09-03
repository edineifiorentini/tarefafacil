// As três frases que valem a pena ler antes dos gráficos. Puro.
//
// **Regra determinística, não texto gerado.** Cada frase aqui sai de uma
// condição verificável, e o número dentro dela é o mesmo que está no cartão
// acima. Um resumo em linguagem natural que "interpreta" o painel é o lugar
// mais fácil do produto para uma alucinação passar despercebida — ela chega
// com a autoridade de um dado.
//
// **Silêncio é uma resposta válida.** Operação saudável não gera insight
// nenhum. "Tudo em dia" ocupando o mesmo espaço de "4 demandas atrasadas"
// treina quem lê a ignorar a área inteira.

import type { RiscoDePrazo } from "./overview";
import { etapaQueMaisSegura, type EtapaDoFluxo } from "./gargalos";
import { JANELA_DE_ATENCAO } from "./overview";

export type TomDoInsight = "critico" | "atencao" | "neutro";

export type Insight = {
  id: string;
  texto: string;
  tom: TomDoInsight;
  /** Para onde o insight leva, quando há para onde levar. */
  acao?: { rotulo: string; drill: DrillDoInsight };
};

export type DrillDoInsight =
  | { tipo: "atrasadas" }
  | { tipo: "atencao" }
  | { tipo: "setor"; sectorId: string };

/** Quantos insights cabem antes da área virar um segundo relatório. */
const MAXIMO = 3;

export type EntradaDeInsights = {
  risco: RiscoDePrazo;
  criadas: number;
  entregues: number;
  etapas: EtapaDoFluxo[];
  /** Setor com mais entregas no período, se houver entregas. */
  setorLider?: { sectorId: string; nome: string; entregues: number } | null;
};

/**
 * Até três frases, da mais urgente para a mais informativa.
 *
 * A ordem é a ordem de ação: o que já estourou, o que vai estourar, o que
 * está entupindo, o que só é bom saber.
 */
export function insightsOperacionais(e: EntradaDeInsights): Insight[] {
  const lista: Insight[] = [];

  if (e.risco.atrasadas > 0) {
    const n = e.risco.atrasadas;
    lista.push({
      id: "atrasadas",
      tom: "critico",
      texto:
        n === 1
          ? "1 demanda está atrasada."
          : `${n} demandas estão atrasadas.`,
      acao: { rotulo: "Ver atrasadas", drill: { tipo: "atrasadas" } },
    });
  }

  if (e.risco.emAtencao > 0) {
    const n = e.risco.emAtencao;
    lista.push({
      id: "atencao",
      tom: "atencao",
      texto:
        n === 1
          ? `1 demanda vence nos próximos ${JANELA_DE_ATENCAO} dias.`
          : `${n} demandas vencem nos próximos ${JANELA_DE_ATENCAO} dias.`,
      acao: { rotulo: "Ver em atenção", drill: { tipo: "atencao" } },
    });
  }

  // Fila crescendo. Só quando a diferença é material: entrar uma a mais
  // num mês não é notícia, e uma frase por ruído gasta o crédito da área.
  const saldo = e.criadas - e.entregues;
  if (saldo >= 3) {
    lista.push({
      id: "saldo",
      tom: "atencao",
      texto: `Entraram ${saldo} demandas a mais do que foram concluídas.`,
    });
  }

  const gargalo = etapaQueMaisSegura(e.etapas);
  if (gargalo) {
    lista.push({
      id: "gargalo",
      tom: "atencao",
      // "Espera acumulada", e não "do tempo total": o cálculo olha as
      // demandas paradas AGORA, não o histórico do período. Ver
      // `gargalos.ts`.
      texto: `A etapa "${gargalo.etapa.nome}" concentra ${Math.round(gargalo.fatia * 100)}% da espera acumulada.`,
    });
  }

  // Concentração de entregas: informação de distribuição, não elogio. Só
  // aparece com volume suficiente para a fatia significar alguma coisa —
  // "um setor fez 100% das entregas" quando houve duas entregas é ruído.
  if (e.setorLider && e.entregues >= 5) {
    const fatia = e.setorLider.entregues / e.entregues;
    if (fatia >= 0.3) {
      lista.push({
        id: "lider",
        tom: "neutro",
        texto: `${e.setorLider.nome} concentrou ${Math.round(fatia * 100)}% das entregas.`,
        acao: {
          rotulo: "Filtrar por este setor",
          drill: { tipo: "setor", sectorId: e.setorLider.sectorId },
        },
      });
    }
  }

  return lista.slice(0, MAXIMO);
}
