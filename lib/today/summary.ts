import type { Member } from "@/lib/queries/useMembers";
import type { Sector, Task } from "@/types/database";

import { localDayOf } from "@/lib/dates/day";

/**
 * As contas do Hoje.
 *
 * **O recorte é o dia, e é isso que separa esta tela do Dashboard.** Lá os
 * números falam do mês e dos últimos 30 dias; aqui falam do que está na
 * frente agora. Se um número daqui puder ser respondido pelo Dashboard, ele
 * não deveria estar aqui — duas telas com a mesma conta divergem no primeiro
 * ajuste de regra.
 *
 * Funções puras de propósito: "quem está sobrecarregado hoje" é o tipo de
 * conta que erra em silêncio, e teste de componente não pega isso.
 */
export type SectorLoad = {
  id: string;
  name: string;
  color: string;
  count: number;
};

export type PersonLoad = {
  /** `null` é o balde de "ninguém pegou" — a informação mais útil aqui. */
  id: string | null;
  name: string;
  count: number;
};

export type Distribution = {
  porSetor: SectorLoad[];
  porPessoa: PersonLoad[];
};

/** Os quatro baldes do dia. Cada tarefa aberta cai em exatamente um. */
export type Bucket = "atrasadas" | "hoje" | "proximos" | "sem_data";

export type Buckets = Record<Bucket, Task[]>;

/** Quantos dias à frente contam como "próximos dias". */
export const PROXIMOS_DIAS = 7;

/** Quantos aparecem nas barras. Além disso vira lista, não resumo. */
const TETO_BARRAS = 5;

/** Aberta = não concluída e não cancelada. Cancelada não é pendência. */
export function estaAberta(t: Task): boolean {
  return t.completed_at === null && t.cancelled_at === null;
}

/**
 * Separa as tarefas abertas nos baldes do dia.
 *
 * Compara `due_date` como texto `YYYY-MM-DD` contra o dia civil de quem está
 * olhando. É o mesmo critério do resto do app: `due_date` não tem hora nem
 * fuso, então comparar com um instante em UTC erraria à noite.
 */
export function bucketTasks(tasks: Task[], hoje: string): Buckets {
  const buckets: Buckets = {
    atrasadas: [],
    hoje: [],
    proximos: [],
    sem_data: [],
  };

  const limite = somarDias(hoje, PROXIMOS_DIAS);

  for (const t of tasks) {
    if (!estaAberta(t)) continue;
    if (t.due_date === null) {
      buckets.sem_data.push(t);
    } else if (t.due_date < hoje) {
      buckets.atrasadas.push(t);
    } else if (t.due_date === hoje) {
      buckets.hoje.push(t);
    } else if (t.due_date <= limite) {
      buckets.proximos.push(t);
    }
    // Depois da janela dos próximos dias, a tarefa não pertence a esta tela.
  }

  // Dentro do balde, a mais urgente primeiro. Sem prazo para comparar, o
  // "sem data" usa a chegada: a mais recente é a que a pessoa acabou de
  // registrar e ainda tem na cabeça.
  buckets.atrasadas.sort(porPrazo);
  buckets.hoje.sort(porPrazo);
  buckets.proximos.sort(porPrazo);
  buckets.sem_data.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return buckets;
}

function porPrazo(a: Task, b: Task): number {
  return (a.due_date ?? "").localeCompare(b.due_date ?? "");
}

/** Soma dias a uma data civil `YYYY-MM-DD`, sem envolver fuso. */
function somarDias(dia: string, dias: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  // Meio-dia evita que horário de verão empurre o resultado um dia.
  const data = new Date(ano, mes - 1, d + dias, 12);
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mm}-${dd}`;
}

/**
 * Quem carrega o quê, dentro do conjunto que a tela está mostrando.
 *
 * Recebe a lista já filtrada em vez de calcular sobre tudo: a distribuição
 * responde ao filtro ativo, senão ela contradiz a lista logo ao lado — a
 * pessoa vê duas atrasadas e um resumo falando de cinco demandas.
 */
export function distribute(
  tasks: Task[],
  sectors: Sector[],
  members: Member[]
): Distribution {
  const porSetorId = new Map<string, number>();
  const porPessoaId = new Map<string | null, number>();

  for (const t of tasks) {
    porSetorId.set(t.sector_id, (porSetorId.get(t.sector_id) ?? 0) + 1);
    porPessoaId.set(t.assignee_id, (porPessoaId.get(t.assignee_id) ?? 0) + 1);
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
    porSetor: maisCarregados(porSetor),
    porPessoa: maisCarregados(porPessoa),
  };
}

function maisCarregados<T extends { count: number }>(itens: T[]): T[] {
  return itens.sort((a, b) => b.count - a.count).slice(0, TETO_BARRAS);
}

/**
 * Concluídas hoje.
 *
 * Único número da faixa que fala do que já saiu — e é o que dá a sensação de
 * progresso num dia cheio. Conta pelo dia LOCAL: às 23h em UTC-3 já é o dia
 * seguinte em UTC, e a tarefa entregue à noite sumiria do dia de quem a
 * entregou.
 */
export function countConcluidasHoje(tasks: Task[], hoje: string): number {
  let n = 0;
  for (const t of tasks) {
    if (t.completed_at !== null && localDayOf(t.completed_at) === hoje) n++;
  }
  return n;
}
