// Carga e prazos por pessoa. Puro.
//
// **Isto não é um ranking de produtividade, e a ausência é deliberada.**
// O banco não guarda peso, complexidade nem estimativa confiável em toda
// demanda (`estimate_minutes` é opcional e quase sempre nulo), então
// qualquer nota calculada a partir de quantidade compararia quem faz coisas
// diferentes. As colunas dizem CARGA, DISTRIBUIÇÃO, PONTUALIDADE e VOLUME
// CONCLUÍDO — fatos —, e a leitura fica com quem conhece o trabalho.
//
// A pergunta que ele responde é "quem está sobrecarregado e o que está
// prestes a estourar", não "quem é o melhor".

import {
  indicadoresDe,
  taxaDePontualidade,
  SEM_RESPONSAVEL,
  type Indicadores,
  type Periodo,
} from "./overview";
import type { Task } from "@/types/database";

export type LinhaDePessoa = {
  /** `null` é o balde de quem não tem responsável. */
  userId: string | null;
  ind: Indicadores;
  /** Abertas agora, com ou sem prazo. É a CARGA. */
  abertas: number;
  pontualidade: number | null;
};

/**
 * Uma linha por pessoa da equipe, mais o balde sem responsável.
 *
 * **A equipe inteira aparece, mesmo zerada** — a mesma decisão de
 * `porPessoa` (0082), e pelo mesmo motivo: "ninguém atribuiu nada ao Igor"
 * é exatamente o que um gestor precisa enxergar, e uma lista só de exceções
 * apaga essa informação.
 *
 * **O balde sem responsável só nasce se houver demanda sem responsável.**
 * Uma linha "Sem responsável: 0" seria ruído permanente. Vem primeiro: a
 * demanda que ninguém assumiu é a que mais apodrece.
 */
export function linhasPorPessoa(
  tasks: Task[],
  periodo: Periodo,
  agora: Date,
  equipe: string[] = []
): LinhaDePessoa[] {
  const porPessoa = new Map<string, Task[]>();
  for (const id of equipe) porPessoa.set(id, []);

  for (const t of tasks) {
    const chave = t.assignee_id ?? SEM_RESPONSAVEL;
    const lista = porPessoa.get(chave);
    if (lista) lista.push(t);
    else porPessoa.set(chave, [t]);
  }

  const linhas: LinhaDePessoa[] = [];
  for (const [chave, delas] of porPessoa) {
    const ind = indicadoresDe(delas, periodo, agora);
    const abertas =
      ind.atrasadasAgora +
      ind.emAtencaoAgora +
      ind.noPrazoAgora +
      ind.semPrazoAgora;

    // O balde sem dono zerado não vira linha; pessoa da equipe zerada vira.
    if (chave === SEM_RESPONSAVEL && abertas === 0 && ind.entregues === 0) {
      continue;
    }

    linhas.push({
      userId: chave === SEM_RESPONSAVEL ? null : chave,
      ind,
      abertas,
      pontualidade: taxaDePontualidade(ind),
    });
  }

  return linhas.sort((a, b) => {
    // Sem responsável primeiro.
    if (a.userId === null) return -1;
    if (b.userId === null) return 1;
    if (b.ind.atrasadasAgora !== a.ind.atrasadasAgora) {
      return b.ind.atrasadasAgora - a.ind.atrasadasAgora;
    }
    if (b.ind.emAtencaoAgora !== a.ind.emAtencaoAgora) {
      return b.ind.emAtencaoAgora - a.ind.emAtencaoAgora;
    }
    return b.abertas - a.abertas;
  });
}
