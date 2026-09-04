// O que a linha diz sobre o prazo. Puro: sem React, sem banco.
//
// Existe porque a tela antiga mentia de duas formas ao mesmo tempo. Uma
// demanda CONCLUÍDA cujo prazo já passou aparecia com o chip vermelho de
// atraso — como se ainda houvesse algo a fazer. E uma demanda cancelada
// continuava mostrando prazo, sendo que ela saiu do fluxo.
//
// A distinção que este módulo carrega, e que a lista inteira depende:
//
// - **atraso é do presente.** "Atrasada há 2 dias" só faz sentido em
//   demanda ABERTA: é o que ainda dá para salvar hoje;
// - **entrega fora do prazo é história.** "Concluída com 3 dias de atraso"
//   é um fato do passado, e pintá-lo de vermelho na lista de hoje faz
//   quem lê procurar uma ação que não existe;
// - **sem prazo não é pontual nem atrasada.** É sem prazo, e diz isso.

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { localDayISO } from "@/lib/dates/day";
import type { Task } from "@/types/database";

/**
 * O tom do prazo. Não é a cor — é o SIGNIFICADO, e quem desenha decide
 * como mostrar. Separar os dois é o que permite reforçar por ícone e por
 * texto em vez de depender do vermelho.
 */
export type TomDoPrazo =
  | "atrasada"
  | "atencao"
  | "normal"
  | "concluida"
  | "cancelada"
  | "sem_prazo";

export type PrazoDaLinha = {
  /** O que aparece na linha: "Hoje, 15h", "Atrasada há 2 dias". */
  texto: string;
  tom: TomDoPrazo;
  /** A data por extenso, para a dica: "19 de agosto de 2026, às 15h". */
  titulo: string | null;
  /** Dias de atraso, quando houver. Alimenta a contagem, não o texto. */
  diasDeAtraso: number;
};

/** Quantos dias à frente um prazo já pede atenção, sem ser atraso. */
export const DIAS_DE_ATENCAO = 2;

function horaCurta(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.slice(0, 5).split(":");
  // "15h" em vez de "15:00" — mais curto e é como se fala. Minuto só
  // aparece quando existe: "15h30".
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

function porExtenso(dia: string, time: string | null | undefined): string {
  const d = format(parseISO(dia), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const h = horaCurta(time);
  return h ? `${d}, às ${h}` : d;
}

/**
 * A frase de prazo de uma demanda, no estado em que ela está.
 *
 * A ORDEM das checagens é a regra de negócio: cancelada e concluída são
 * decididas antes de qualquer conta de data, porque nelas o prazo deixou
 * de ser uma cobrança e virou um registro.
 */
export function descreverPrazo(
  task: Pick<
    Task,
    "due_date" | "due_time" | "completed_at" | "cancelled_at"
  >,
  agora: Date = new Date()
): PrazoDaLinha {
  // Cancelada saiu do fluxo. Mostrar prazo aqui sugere uma entrega que
  // ninguém espera mais.
  if (task.cancelled_at) {
    return {
      texto: "Cancelada",
      tom: "cancelada",
      titulo: task.due_date ? porExtenso(task.due_date, task.due_time) : null,
      diasDeAtraso: 0,
    };
  }

  if (task.completed_at) {
    const entregueEm = localDayISO(parseISO(task.completed_at));
    const titulo = `Concluída em ${porExtenso(entregueEm, null)}`;

    // Diz QUANDO saiu, não só que saiu. O chip de status ao lado já
    // carrega a palavra "Concluída"; repeti-la aqui gastaria a coluna de
    // prazo com informação que a linha já tem.
    if (!task.due_date) {
      return {
        texto: `Concluída em ${format(parseISO(entregueEm), "d MMM", { locale: ptBR })}`,
        tom: "concluida",
        titulo,
        diasDeAtraso: 0,
      };
    }

    const atraso = differenceInCalendarDays(
      parseISO(entregueEm),
      parseISO(task.due_date)
    );

    // Fora do prazo, mas no PASSADO. O tom continua "concluída": a lista
    // de hoje não tem nada a fazer com isto.
    if (atraso > 0) {
      return {
        texto: `Concluída com ${atraso} ${atraso === 1 ? "dia" : "dias"} de atraso`,
        tom: "concluida",
        titulo: `${titulo}. Prazo era ${porExtenso(task.due_date, task.due_time)}`,
        diasDeAtraso: atraso,
      };
    }

    return {
      texto: `Concluída em ${format(parseISO(entregueEm), "d MMM", { locale: ptBR })}`,
      tom: "concluida",
      titulo,
      diasDeAtraso: 0,
    };
  }

  if (!task.due_date) {
    return {
      texto: "Sem prazo",
      tom: "sem_prazo",
      titulo: null,
      diasDeAtraso: 0,
    };
  }

  // Aberta. Só aqui a conta olha para HOJE.
  const dias = differenceInCalendarDays(
    parseISO(task.due_date),
    parseISO(localDayISO(agora))
  );
  const titulo = porExtenso(task.due_date, task.due_time);
  const hora = horaCurta(task.due_time);

  if (dias < 0) {
    const atraso = -dias;
    return {
      texto: `Atrasada há ${atraso} ${atraso === 1 ? "dia" : "dias"}`,
      tom: "atrasada",
      titulo,
      diasDeAtraso: atraso,
    };
  }

  if (dias === 0) {
    return {
      texto: hora ? `Hoje, ${hora}` : "Hoje",
      tom: "atencao",
      titulo,
      diasDeAtraso: 0,
    };
  }

  if (dias === 1) {
    return {
      texto: hora ? `Amanhã, ${hora}` : "Amanhã",
      tom: "atencao",
      titulo,
      diasDeAtraso: 0,
    };
  }

  if (dias <= DIAS_DE_ATENCAO) {
    return {
      texto: `Em ${dias} dias`,
      tom: "atencao",
      titulo,
      diasDeAtraso: 0,
    };
  }

  // Prazo distante: "Em 3 dias" ainda ajuda, mas a partir de uma semana a
  // data seca é mais útil que a contagem — ninguém converte "em 34 dias"
  // para uma data de cabeça.
  if (dias <= 6) {
    return { texto: `Em ${dias} dias`, tom: "normal", titulo, diasDeAtraso: 0 };
  }

  return {
    texto: format(parseISO(task.due_date), "d MMM", { locale: ptBR }),
    tom: "normal",
    titulo,
    diasDeAtraso: 0,
  };
}
