// As visões rápidas da Lista. Puro.
//
// São seis recortes que respondem às perguntas que alguém faz ao abrir a
// tela, na ordem em que costuma fazer: o que está aberto, o que estourou,
// o que é para hoje, o que é para esta semana, o que ninguém pegou, e o
// que já saiu.
//
// **"Em aberto" é a visão inicial**, e essa é a mudança de fundo. A tela
// antiga abria em "Todas", e num workspace com mais concluídas do que
// abertas — o caso normal de quem usa há um mês — o primeiro que se via
// era uma parede de títulos riscados.
//
// DUAS REGRAS QUE ATRAVESSAM TODAS:
//
// 1. **Cancelada não é concluída.** Ela saiu do fluxo por decisão, não por
//    entrega. Misturar as duas faz o contador de "Concluídas" contar
//    trabalho que ninguém fez;
// 2. **Aberta é o que não foi concluído NEM cancelado.** É a mesma
//    definição de `lib/reports/overview.ts` e de `escalation.ts`, de
//    propósito: três telas do mesmo produto discordarem sobre o que é uma
//    demanda viva seria pior do que qualquer uma delas estar errada.

import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

import { FUSO_PADRAO, diaCivilEm } from "@/lib/dates/day";
import type { Task } from "@/types/database";

export type VisaoRapida =
  | "aberto"
  | "atrasadas"
  | "hoje"
  | "semana"
  | "sem_responsavel"
  | "concluidas";

export const VISAO_PADRAO: VisaoRapida = "aberto";

export const VISOES: { value: VisaoRapida; label: string }[] = [
  { value: "aberto", label: "Em aberto" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "hoje", label: "Para hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "sem_responsavel", label: "Sem responsável" },
  { value: "concluidas", label: "Concluídas" },
];

export function ehVisaoRapida(v: string): v is VisaoRapida {
  return VISOES.some((x) => x.value === v);
}

/** Viva: nem concluída, nem cancelada. Com ou sem prazo. */
export function estaAberta(t: Task): boolean {
  return !t.completed_at && !t.cancelled_at;
}

/**
 * A semana corrente, de segunda a domingo.
 *
 * Segunda porque é a convenção do país e a que o resto do produto já usa
 * (`groupTasks` com `weekStartsOn: 1`). Não há configuração de semana no
 * workspace — se um dia houver, é este o ponto que lê.
 */
export function semanaCorrente(
  agora: Date,
  fuso: string = FUSO_PADRAO
): { de: string; ate: string } {
  // Primeiro o DIA CIVIL no fuso pedido, depois a semana em cima dele.
  //
  // A ordem inversa é armadilha, e eu caí nela: `startOfWeek` calcula a
  // borda no fuso do ambiente, e formatar esse instante noutro fuso mistura
  // duas réguas — sob UTC a semana escorregava um dia. Convertendo primeiro,
  // o resto da conta acontece toda dentro do mesmo dia civil.
  const hoje = parseISO(diaCivilEm(agora, fuso));
  return {
    de: format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    ate: format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

/**
 * A demanda entra nesta visão?
 *
 * Cada regra é uma linha, e todas partem de `estaAberta` exceto
 * "concluidas" — que é justamente a exceção.
 */
export function naVisao(
  t: Task,
  visao: VisaoRapida,
  agora: Date,
  fuso: string = FUSO_PADRAO
): boolean {
  const hoje = diaCivilEm(agora, fuso);

  switch (visao) {
    case "aberto":
      return estaAberta(t);

    case "atrasadas":
      return estaAberta(t) && !!t.due_date && t.due_date < hoje;

    case "hoje":
      return estaAberta(t) && t.due_date === hoje;

    case "semana": {
      if (!estaAberta(t) || !t.due_date) return false;
      const { de, ate } = semanaCorrente(agora, fuso);
      return t.due_date >= de && t.due_date <= ate;
    }

    case "sem_responsavel":
      return estaAberta(t) && !t.assignee_id;

    case "concluidas":
      // Só concluídas. Cancelada tem visão própria pelo filtro de status —
      // somá-la aqui inflaria o número de entregas com trabalho que foi
      // abandonado.
      return !!t.completed_at && !t.cancelled_at;
  }
}

export function aplicarVisao(
  tasks: Task[],
  visao: VisaoRapida,
  agora: Date = new Date(),
  fuso: string = FUSO_PADRAO
): Task[] {
  return tasks.filter((t) => naVisao(t, visao, agora, fuso));
}

/**
 * Quantas demandas cada visão tem — para os números dos chips.
 *
 * **Conta sobre a lista JÁ FILTRADA pelos filtros avançados, e não sobre o
 * workspace inteiro.** Se alguém filtrou o setor de Obras, "Atrasadas 4"
 * precisa dizer quatro em Obras; o total do workspace ali seria um número
 * que não bate com nada na tela.
 *
 * Uma passada só: seis `filter` percorreriam a mesma lista seis vezes.
 */
export function contarVisoes(
  tasks: Task[],
  agora: Date = new Date(),
  fuso: string = FUSO_PADRAO
): Record<VisaoRapida, number> {
  const contagem: Record<VisaoRapida, number> = {
    aberto: 0,
    atrasadas: 0,
    hoje: 0,
    semana: 0,
    sem_responsavel: 0,
    concluidas: 0,
  };

  const hoje = diaCivilEm(agora, fuso);
  const { de, ate } = semanaCorrente(agora, fuso);

  for (const t of tasks) {
    if (t.completed_at && !t.cancelled_at) contagem.concluidas++;
    if (!estaAberta(t)) continue;

    contagem.aberto++;
    if (!t.assignee_id) contagem.sem_responsavel++;
    if (!t.due_date) continue;

    if (t.due_date < hoje) contagem.atrasadas++;
    if (t.due_date === hoje) contagem.hoje++;
    if (t.due_date >= de && t.due_date <= ate) contagem.semana++;
  }

  return contagem;
}

/**
 * A ordem de "prazo mais próximo", que é o padrão da tela.
 *
 * Não é ordenar por data: é ordenar por URGÊNCIA, que é outra coisa.
 * Atrasadas primeiro (o que já estourou), depois hoje, depois o futuro em
 * ordem, e **sem prazo por último** — uma demanda sem data combinada não
 * disputa a atenção com uma que vence amanhã.
 *
 * Devolve um número comparável para o `sort` usar.
 */
export function pesoDaUrgencia(
  t: Task,
  agora: Date,
  fuso: string = FUSO_PADRAO
): number {
  if (!t.due_date) return Number.MAX_SAFE_INTEGER;
  return differenceInCalendarDays(
    parseISO(t.due_date),
    parseISO(diaCivilEm(agora, fuso))
  );
}
