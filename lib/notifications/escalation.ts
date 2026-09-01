// Quem enxerga o prazo de quem (0082). Puro: sem banco, sem React.
//
// O PROBLEMA QUE ISTO RESOLVE, nas palavras do dono (31/ago/2026): "minha
// equipe sempre me reporta sobre as tarefas e dúvidas, mas geralmente não me
// reporta uma tarefa que está para cumprir ou que está em atraso".
//
// O sistema já escalava metade disso. Em `derive.ts`:
//
//   // Prazo que ainda não venceu só interessa a quem vai entregar.
//   if (!mine) continue;
//
// Ou seja: o gestor recebe a tarefa ATRASADA da equipe e nunca a que está
// PARA VENCER — que é justamente a que ainda dá para salvar.
//
// A classificação de risco é importada de `derive.ts`, não reescrita: duas
// definições de "atrasada" concordam por acaso até o dia em que uma muda.

import { differenceInCalendarDays, parseISO } from "date-fns";

import type { MemberRole, Task } from "@/types/database";

import { isPending, TASK_SOON_DAYS, todayISO } from "./derive";

/**
 * O alcance de quem está olhando.
 *
 * `tudo` é do dono e de quem administra. `setores` é do gestor — e ele pode
 * responder por mais de um, porque na prática uma pessoa lidera mais de uma
 * área antes de a empresa ter uma pessoa por área.
 */
export type Escopo = { tudo: boolean; setores: string[] };

export type SetorComGestor = { id: string; responsavel_id: string | null };

/**
 * O que esta pessoa enxerga.
 *
 * **Ser gestor não depende do papel, e é decisão de produto (0082).** Neste
 * sistema `admin` abre o módulo financeiro inteiro; um líder de equipe
 * precisa do prazo do time, não do caixa da empresa. Por isso um `member`
 * comum pode responder por um setor, e `escopoDe` olha as duas coisas.
 */
export function escopoDe(
  userId: string,
  role: MemberRole | null | undefined,
  setores: SetorComGestor[]
): Escopo {
  if (role === "owner" || role === "admin") {
    return { tudo: true, setores: [] };
  }
  return {
    tudo: false,
    setores: setores
      .filter((s) => s.responsavel_id === userId)
      .map((s) => s.id),
  };
}

/**
 * As demandas que entram no relatório desta pessoa.
 *
 * Sempre inclui as próprias, mesmo fora dos setores que ela gere: quem
 * lidera também entrega, e um relatório de prazos que esconde o próprio
 * atraso é um relatório que ninguém leva a sério.
 */
export function tarefasDoEscopo(
  tasks: Task[],
  escopo: Escopo,
  userId: string
): Task[] {
  if (escopo.tudo) return tasks;
  const dele = new Set(escopo.setores);
  return tasks.filter(
    (t) => dele.has(t.sector_id) || t.assignee_id === userId
  );
}

export type Risco = "atrasada" | "vence_hoje" | "vence_em_breve";

/**
 * Quantos dias à frente o RELATÓRIO considera "em breve".
 *
 * Sete, e não os três de `TASK_SOON_DAYS`, porque os dois objetos servem a
 * ritmos diferentes: o sino interrompe alguém no meio do trabalho e precisa
 * ser curto; o relatório é consultado por quem planeja a semana da equipe.
 * Com três dias, uma demanda para daqui a cinco some da tela de quem
 * justamente precisa remanejar gente antes que ela atrase.
 *
 * Sete é o mesmo horizonte de "Próximos dias" na tela Hoje.
 */
export const JANELA_DO_RELATORIO = 7;

/**
 * O risco de uma demanda, ou null quando não há.
 *
 * Usa `isPending` de `derive.ts` — a MESMA regra do sino para o que conta
 * como demanda viva. Só a JANELA difere, e o parâmetro deixa isso explícito
 * em vez de esconder duas constantes parecidas em arquivos diferentes.
 */
export function riscoDe(
  task: Task,
  agora = new Date(),
  janelaDias = TASK_SOON_DAYS
): Risco | null {
  if (!isPending(task)) return null;

  const dias = differenceInCalendarDays(
    parseISO(task.due_date as string),
    parseISO(todayISO(agora))
  );

  if (dias < 0) return "atrasada";
  if (dias === 0) return "vence_hoje";
  if (dias <= janelaDias) return "vence_em_breve";
  return null;
}

/** Demanda viva: não concluída, não cancelada. Com ou sem prazo. */
function estaAberta(task: Task): boolean {
  return !task.completed_at && !task.cancelled_at;
}

export type LinhaDaEquipe = {
  /** Nulo é o balde de quem não tem responsável. */
  userId: string | null;
  atrasadas: number;
  venceHoje: number;
  venceEmBreve: number;
  /** Soma dos três acima — o que está em risco. */
  total: number;
  /**
   * Demandas abertas atribuídas a esta pessoa, com ou sem prazo.
   *
   * Separa duas situações que os contadores de risco deixam idênticas: quem
   * está EM DIA (abertas > 0, risco 0) e quem está SEM NADA atribuído
   * (abertas 0). Para quem gere equipe, a segunda é informação, não
   * ausência dela.
   */
  abertas: number;
};

const SEM_DONO = " sem";

/**
 * O relatório por pessoa — o formato que o dono pediu, e o certo: alerta
 * por tarefa no sino vira ruído para quem tem vinte pessoas.
 *
 * **A equipe inteira aparece, não só quem tem risco.** Nasceu listando só
 * exceções e estava errado: assim, uma pessoa em dia e uma pessoa sem nada
 * atribuído sumiam do mesmo jeito. O dono apontou em 31/ago/2026 — ele tem
 * um cooperado sem demanda nenhuma, e "ninguém atribuiu nada ao Igor" é
 * exatamente o que um gestor precisa enxergar.
 *
 * **O balde sem responsável vem primeiro**, e só nasce se houver demanda sem
 * responsável: uma linha "Sem responsável: 0" seria ruído permanente. A
 * demanda que ninguém assumiu é a que mais apodrece — não tem dono para
 * lembrar dela.
 *
 * Ordem: sem responsável, depois mais atrasadas, depois mais em risco,
 * depois quem carrega mais trabalho aberto.
 */
export function porPessoa(
  tasks: Task[],
  opcoes: {
    /** Ids que aparecem SEMPRE, mesmo zerados. É a equipe do relatório. */
    equipe?: string[];
    janelaDias?: number;
  } = {},
  agora = new Date()
): LinhaDaEquipe[] {
  const { equipe = [], janelaDias = JANELA_DO_RELATORIO } = opcoes;
  const baldes = new Map<string, LinhaDaEquipe>();

  const balde = (userId: string | null) => {
    const chave = userId ?? SEM_DONO;
    let linha = baldes.get(chave);
    if (!linha) {
      linha = {
        userId,
        atrasadas: 0,
        venceHoje: 0,
        venceEmBreve: 0,
        total: 0,
        abertas: 0,
      };
      baldes.set(chave, linha);
    }
    return linha;
  };

  // A equipe entra ANTES das demandas: quem não tem nada atribuído precisa
  // aparecer zerado em vez de sumir.
  for (const id of equipe) balde(id);

  for (const t of tasks) {
    if (!estaAberta(t)) continue;

    const linha = balde(t.assignee_id);
    linha.abertas++;

    const risco = riscoDe(t, agora, janelaDias);
    if (!risco) continue;

    if (risco === "atrasada") linha.atrasadas++;
    else if (risco === "vence_hoje") linha.venceHoje++;
    else linha.venceEmBreve++;
    linha.total++;
  }

  return [...baldes.values()].sort((a, b) => {
    if (a.userId === null) return -1;
    if (b.userId === null) return 1;
    if (b.atrasadas !== a.atrasadas) return b.atrasadas - a.atrasadas;
    if (b.total !== a.total) return b.total - a.total;
    return b.abertas - a.abertas;
  });
}

/**
 * Quem aparece no relatório mesmo sem nada atribuído.
 *
 * **Só quem enxerga tudo recebe a lista completa**, e a razão é uma lacuna
 * real do modelo: o sistema NÃO liga pessoa a setor. Uma pessoa se relaciona
 * com um setor apenas através das demandas que recebeu. Não existe "quem é
 * do time de Obras".
 *
 * Consequência aceita: o dono enxerga quem está ocioso; o gestor de setor
 * não, porque para ele "ocioso no meu setor" é indistinguível de "não é do
 * meu setor". Dar a lista inteira ao gestor encheria o relatório dele de
 * gente de outras áreas — pior que a lacuna.
 *
 * Ele sempre aparece, mesmo sem demanda: quem lidera também entrega, e um
 * relatório que esconde o próprio nome não é levado a sério.
 */
export function equipeDoRelatorio(
  escopo: Escopo,
  userId: string,
  membrosAtivos: string[]
): string[] {
  return escopo.tudo ? membrosAtivos : [userId];
}
