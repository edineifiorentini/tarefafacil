import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

import {
  ehVisaoRapida,
  pesoDaUrgencia,
  VISAO_PADRAO,
  type VisaoRapida,
} from "./quick-views";
import type { Sector, Task } from "@/types/database";

export type GroupBy =
  | "none"
  | "overdue"
  | "day"
  | "week"
  | "client"
  | "assignee"
  | "sector"
  | "priority"
  | "status"
  | "no_date";

export type SortBy =
  | "due"
  | "due_desc"
  | "priority"
  | "client"
  | "created"
  | "updated"
  | "title_az"
  | "title_za";
export type StatusFilter =
  "todas" | "aberta" | "concluida" | "cancelada" | "atrasada";

export type ListFilters = {
  q: string;
  status: StatusFilter;
  sectorIds: string[];
  priorities: string[];
  clientId: string | null;
  assigneeId: string | null;
  dueWithinDays: 7 | 14 | 30 | null;
  /**
   * Com prazo, sem prazo, ou tanto faz.
   *
   * Separado de `dueWithinDays` porque são perguntas diferentes: um é "o
   * que vence nos próximos N dias", o outro é "o que ninguém combinou data".
   */
  temPrazo: "com" | "sem" | null;
};

export const EMPTY_LIST_FILTERS: ListFilters = {
  q: "",
  status: "todas",
  sectorIds: [],
  priorities: [],
  clientId: null,
  assigneeId: null,
  dueWithinDays: null,
  temPrazo: null,
};

/**
 * O estado inteiro da tela: a visão rápida, os filtros e a apresentação.
 *
 * Junto num objeto só porque é isto que vai para a URL, para a visualização
 * salva e para o `useMemo` — três consumidores que precisam concordar sobre
 * o que é "a tela agora".
 */
export type EstadoDaLista = {
  visao: VisaoRapida;
  filtros: ListFilters;
  groupBy: GroupBy;
  sortBy: SortBy;
};

export const ESTADO_PADRAO: EstadoDaLista = {
  visao: VISAO_PADRAO,
  filtros: EMPTY_LIST_FILTERS,
  groupBy: "none",
  sortBy: "due",
};

const STATUS_VALIDOS: StatusFilter[] = [
  "todas",
  "aberta",
  "concluida",
  "cancelada",
  "atrasada",
];

/**
 * Os filtros escritos na URL.
 *
 * Existe para o relatório poder mandar alguém para cá já filtrado: clicar
 * em "4 atrasadas" abre a Lista nas quatro. Sem isto, o número do relatório
 * seria um beco — dá para ver que existem quatro e não dá para ver QUAIS.
 *
 * **Tudo é validado.** A barra de endereço é entrada de usuário como
 * qualquer outra, e um `?status=xyz` colado ali não pode virar um filtro
 * inválido que esconde a lista inteira sem explicar por quê. Valor
 * desconhecido é ignorado, e o filtro fica no padrão.
 */
export function filtrosDaURL(params: URLSearchParams): ListFilters {
  const status = params.get("status") ?? "";
  const prazo = Number(params.get("prazo"));
  const setores = (params.get("setores") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ...EMPTY_LIST_FILTERS,
    status: STATUS_VALIDOS.includes(status as StatusFilter)
      ? (status as StatusFilter)
      : "todas",
    sectorIds: setores,
    assigneeId: params.get("responsavel") || null,
    // Só os três horizontes que o seletor oferece: um "?prazo=3" viraria um
    // estado que a interface não consegue mostrar nem desfazer.
    dueWithinDays:
      prazo === 7 || prazo === 14 || prazo === 30
        ? (prazo as 7 | 14 | 30)
        : null,
  };
}

const GRUPOS_VALIDOS: GroupBy[] = [
  "none", "overdue", "day", "week", "client",
  "assignee", "sector", "priority", "status", "no_date",
];
const ORDENS_VALIDAS: SortBy[] = [
  "due", "due_desc", "priority", "client",
  "created", "updated", "title_az", "title_za",
];

/**
 * O estado inteiro da tela, lido da URL.
 *
 * **Tudo é validado.** A barra de endereço é entrada de usuário: um
 * `?ordenar=xyz` colado ali não pode virar um estado que a interface não
 * consegue mostrar nem desfazer.
 */
export function estadoDaURL(params: URLSearchParams): EstadoDaLista {
  const visao = params.get("visao") ?? "";
  const grupo = params.get("agrupar") ?? "";
  const ordem = params.get("ordenar") ?? "";
  const temPrazo = params.get("temprazo");

  return {
    visao: ehVisaoRapida(visao) ? visao : VISAO_PADRAO,
    filtros: {
      ...filtrosDaURL(params),
      q: params.get("q") ?? "",
      clientId: params.get("cliente") || null,
      priorities: (params.get("prioridades") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      temPrazo: temPrazo === "com" || temPrazo === "sem" ? temPrazo : null,
    },
    groupBy: GRUPOS_VALIDOS.includes(grupo as GroupBy)
      ? (grupo as GroupBy)
      : "none",
    sortBy: ORDENS_VALIDAS.includes(ordem as SortBy) ? (ordem as SortBy) : "due",
  };
}

/**
 * O caminho de volta: o estado vira endereço.
 *
 * **Só o que difere do padrão entra.** Uma URL que carrega
 * `?visao=aberto&agrupar=none&ordenar=due` diz exatamente o mesmo que
 * `/lista` e é bem pior de ler, de compartilhar e de reconhecer no
 * histórico do navegador.
 */
export function estadoParaURL(e: EstadoDaLista): string {
  const p = new URLSearchParams();
  const por = (chave: string, valor: string | null | undefined) => {
    if (valor) p.set(chave, valor);
  };

  if (e.visao !== VISAO_PADRAO) p.set("visao", e.visao);
  por("q", e.filtros.q.trim());
  if (e.filtros.status !== "todas") p.set("status", e.filtros.status);
  por("setores", e.filtros.sectorIds.join(","));
  por("prioridades", e.filtros.priorities.join(","));
  por("cliente", e.filtros.clientId);
  por("responsavel", e.filtros.assigneeId);
  if (e.filtros.dueWithinDays) p.set("prazo", String(e.filtros.dueWithinDays));
  por("temprazo", e.filtros.temPrazo);
  if (e.groupBy !== "none") p.set("agrupar", e.groupBy);
  if (e.sortBy !== "due") p.set("ordenar", e.sortBy);

  return p.toString();
}

/**
 * Há algum filtro AVANÇADO ligado?
 *
 * A visão rápida não conta: ela é a navegação da tela, não um filtro que
 * alguém esqueceu ligado. Contá-la faria o badge de "Filtros" nascer com 1
 * e o botão "Limpar" aparecer sempre.
 */
export function contarFiltrosAtivos(f: ListFilters): number {
  let n = 0;
  if (f.status !== "todas") n++;
  if (f.sectorIds.length) n++;
  if (f.priorities.length) n++;
  if (f.clientId) n++;
  if (f.assigneeId) n++;
  if (f.dueWithinDays) n++;
  if (f.temPrazo) n++;
  return n;
}

const PRIORITY_RANK: Record<string, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
  sem_prioridade: 4,
};

export function isOverdue(t: Task, now: Date): boolean {
  return (
    !t.completed_at &&
    !t.cancelled_at &&
    !!t.due_date &&
    differenceInCalendarDays(parseISO(t.due_date), now) < 0
  );
}

export function filterTasks(
  tasks: Task[],
  f: ListFilters,
  now: Date = new Date()
): Task[] {
  const q = f.q.trim().toLowerCase();
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (f.sectorIds.length && !f.sectorIds.includes(t.sector_id)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.clientId && t.client_id !== f.clientId) return false;
    if (f.assigneeId && t.assignee_id !== f.assigneeId) return false;

    switch (f.status) {
      case "aberta":
        if (t.completed_at || t.cancelled_at) return false;
        break;
      case "concluida":
        if (!t.completed_at) return false;
        break;
      case "cancelada":
        if (!t.cancelled_at) return false;
        break;
      case "atrasada":
        if (!isOverdue(t, now)) return false;
        break;
      default:
        break;
    }

    if (f.temPrazo === "com" && !t.due_date) return false;
    if (f.temPrazo === "sem" && t.due_date) return false;

    if (f.dueWithinDays != null) {
      if (!t.due_date || t.completed_at || t.cancelled_at) return false;
      const diff = differenceInCalendarDays(parseISO(t.due_date), now);
      if (diff < 0 || diff > f.dueWithinDays) return false;
    }
    return true;
  });
}

export function sortTasks(
  tasks: Task[],
  sortBy: SortBy,
  clientNameById: Map<string, string>,
  now: Date = new Date()
): Task[] {
  const arr = [...tasks];
  arr.sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return (
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
        );
      case "client":
        return (clientNameById.get(a.client_id ?? "") ?? "").localeCompare(
          clientNameById.get(b.client_id ?? "") ?? ""
        );
      case "created":
        return b.created_at.localeCompare(a.created_at);
      case "updated":
        return b.updated_at.localeCompare(a.updated_at);
      case "title_az":
        return a.title.localeCompare(b.title, "pt-BR");
      case "title_za":
        return b.title.localeCompare(a.title, "pt-BR");
      case "due_desc":
        // Prazo mais distante. Sem prazo continua por último: ela não é
        // "a mais distante de todas", é outra coisa.
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return b.due_date.localeCompare(a.due_date);
      case "due":
      default: {
        // **Urgência, não data.** Atrasadas primeiro, depois hoje, depois o
        // futuro em ordem, e sem prazo por último — uma demanda sem data
        // combinada não disputa atenção com uma que vence amanhã.
        //
        // A versão antiga ordenava só pela string da data, o que dava o
        // mesmo resultado na maioria dos casos e o resultado errado no que
        // importa: com "sem prazo" jogado ao fim por um `if`, e nada
        // separando o atrasado do que ainda dá tempo.
        return pesoDaUrgencia(a, now) - pesoDaUrgencia(b, now);
      }
    }
  });
  return arr;
}

export type TaskGroup = { key: string; label: string; tasks: Task[] };

const ROTULO_DE_PRIORIDADE: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Normal",
  baixa: "Baixa",
  sem_prioridade: "Sem prioridade",
};

export function groupTasks(
  tasks: Task[],
  groupBy: GroupBy,
  ctx: {
    clientNameById: Map<string, string>;
    memberNameById: Map<string, string>;
    sectorById?: Map<string, Sector>;
  },
  now: Date = new Date()
): TaskGroup[] {
  if (groupBy === "none") {
    return tasks.length ? [{ key: "all", label: "Todas", tasks }] : [];
  }

  const buckets = new Map<string, TaskGroup>();
  function push(key: string, label: string, t: Task) {
    let g = buckets.get(key);
    if (!g) {
      g = { key, label, tasks: [] };
      buckets.set(key, g);
    }
    g.tasks.push(t);
  }

  for (const t of tasks) {
    switch (groupBy) {
      case "overdue": {
        const overdue = isOverdue(t, now);
        push(overdue ? "overdue" : "ok", overdue ? "Atrasadas" : "No prazo", t);
        break;
      }
      case "day": {
        push(t.due_date ?? "no_date", t.due_date ?? "Sem data", t);
        break;
      }
      case "week": {
        if (!t.due_date) {
          push("no_date", "Sem data", t);
          break;
        }
        const start = startOfWeek(parseISO(t.due_date), { weekStartsOn: 1 });
        const key = start.toISOString().slice(0, 10);
        push(key, `Semana de ${format(start, "dd/MM")}`, t);
        break;
      }
      case "client": {
        const id = t.client_id ?? "none";
        push(
          id,
          t.client_id
            ? (ctx.clientNameById.get(t.client_id) ?? "Cliente removido")
            : "Sem cliente",
          t
        );
        break;
      }
      case "assignee": {
        const id = t.assignee_id ?? "none";
        push(
          id,
          t.assignee_id
            ? (ctx.memberNameById.get(t.assignee_id) ?? "Removido")
            : "Sem responsável",
          t
        );
        break;
      }
      case "status": {
        const key = t.cancelled_at
          ? "cancelada"
          : t.completed_at
            ? "concluida"
            : "aberta";
        const label =
          key === "cancelada"
            ? "Canceladas"
            : key === "concluida"
              ? "Concluídas"
              : "Abertas";
        push(key, label, t);
        break;
      }
      case "sector": {
        push(
          t.sector_id,
          ctx.sectorById?.get(t.sector_id)?.name ?? "Setor removido",
          t
        );
        break;
      }
      case "priority": {
        push(
          t.priority,
          ROTULO_DE_PRIORIDADE[t.priority] ?? "Sem prioridade",
          t
        );
        break;
      }
      case "no_date": {
        push(
          t.due_date ? "with_date" : "no_date",
          t.due_date ? "Com data" : "Sem data",
          t
        );
        break;
      }
    }
  }
  return [...buckets.values()];
}
