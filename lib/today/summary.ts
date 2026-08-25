import type { Member } from "@/lib/queries/useMembers";
import type { Sector, Task } from "@/types/database";

import { localDayOf } from "@/lib/dates/day";

/**
 * Números do dia, para o topo do Hoje.
 *
 * **O recorte é o dia, e é isso que separa esta tela do Dashboard.** Lá os
 * números falam do mês e dos últimos 30 dias; aqui falam do que está na
 * frente agora. Se um número daqui puder ser respondido pelo Dashboard, ele
 * não deveria estar aqui — duas telas com a mesma conta divergem no primeiro
 * ajuste de regra.
 *
 * Função pura de propósito: a conta de "quem está sobrecarregado hoje" é o
 * tipo de coisa que erra em silêncio, e teste de componente não pega isso.
 */
export type SectorLoad = {
  id: string;
  name: string;
  color: string;
  count: number;
};

export type PersonLoad = {
  /** `null` é o balde de "ninguém pegou" — que é a informação mais útil aqui. */
  id: string | null;
  name: string;
  count: number;
};

export type TodaySummary = {
  atrasadas: number;
  hoje: number;
  semData: number;
  concluidasHoje: number;
  /** Só hoje + atrasadas, ordenado do mais carregado para o menos. */
  porSetor: SectorLoad[];
  porPessoa: PersonLoad[];
};

/** Aberta = não concluída e não cancelada. Cancelada não é pendência. */
function estaAberta(t: Task): boolean {
  return t.completed_at === null && t.cancelled_at === null;
}

/**
 * O que "pesa hoje": vence hoje ou já venceu.
 *
 * Sem data não entra: ninguém prometeu nada, e contá-la como carga faria o
 * setor que registra ideias parecer o mais atolado da empresa.
 */
function pesaHoje(t: Task, hoje: string): boolean {
  return estaAberta(t) && t.due_date !== null && t.due_date <= hoje;
}

function ordenaEContaOutros<T extends { count: number }>(
  itens: T[],
  teto: number
): T[] {
  return itens.sort((a, b) => b.count - a.count).slice(0, teto);
}

/** Quantos aparecem nas barras. Além disso vira lista, não resumo. */
const TETO_BARRAS = 5;

export function summarizeToday(
  tasks: Task[],
  sectors: Sector[],
  members: Member[],
  hoje: string
): TodaySummary {
  let atrasadas = 0;
  let hojeCount = 0;
  let semData = 0;
  let concluidasHoje = 0;

  const porSetorId = new Map<string, number>();
  const porPessoaId = new Map<string | null, number>();

  for (const t of tasks) {
    // Concluída hoje conta mesmo estando fechada — é o único número da faixa
    // que fala do que já saiu, e é o que dá a sensação de progresso.
    if (t.completed_at !== null && localDayOf(t.completed_at) === hoje) {
      concluidasHoje++;
    }

    if (!estaAberta(t)) continue;

    if (t.due_date === null) {
      semData++;
      continue;
    }
    if (t.due_date < hoje) atrasadas++;
    else if (t.due_date === hoje) hojeCount++;

    if (pesaHoje(t, hoje)) {
      porSetorId.set(t.sector_id, (porSetorId.get(t.sector_id) ?? 0) + 1);
      porPessoaId.set(t.assignee_id, (porPessoaId.get(t.assignee_id) ?? 0) + 1);
    }
  }

  const setorPorId = new Map(sectors.map((s) => [s.id, s]));
  const membroPorId = new Map(members.map((m) => [m.user_id, m]));

  const porSetor: SectorLoad[] = [];
  for (const [id, count] of porSetorId) {
    const setor = setorPorId.get(id);
    // Setor apagado não deveria existir (0043 usa `on delete restrict`), mas
    // a lista chega por cache e pode estar meio passo atrás.
    if (!setor) continue;
    porSetor.push({ id, name: setor.name, color: setor.color, count });
  }

  const porPessoa: PersonLoad[] = [];
  for (const [id, count] of porPessoaId) {
    if (id === null) {
      porPessoa.push({ id: null, name: "Sem responsável", count });
      continue;
    }
    const membro = membroPorId.get(id);
    porPessoa.push({
      id,
      name: membro?.display_name ?? membro?.email ?? "Alguém",
      count,
    });
  }

  return {
    atrasadas,
    hoje: hojeCount,
    semData,
    concluidasHoje,
    porSetor: ordenaEContaOutros(porSetor, TETO_BARRAS),
    porPessoa: ordenaEContaOutros(porPessoa, TETO_BARRAS),
  };
}
