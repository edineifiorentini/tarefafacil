// Métricas da plataforma. Só servidor — usa a chave secreta e enxerga todas
// as empresas.
//
// REGRA: nenhuma métrica é calculada em componente (especificação 8.4). Este
// arquivo é a fonte única, e cada fórmula está escrita ao lado do código que
// a implementa, porque número de painel sem definição vira discussão.
//
// VOLUME: a agregação acontece aqui, em TypeScript, sobre poucas consultas em
// bloco — não uma consulta por linha. Funciona bem na ordem de milhares de
// empresas. Passando disso, o caminho é virar view materializada no Postgres;
// a fronteira já está isolada nas funções `carregar*` para facilitar a troca.

import { createAdminClient } from "@/lib/supabase/admin";

/** Janelas oferecidas no seletor de período. */
export type Janela = 7 | 30 | 90;

export type Kpi = {
  /** Valor no fim do período. */
  valor: number;
  /** Mesmo cálculo na janela imediatamente anterior, para comparação. */
  anterior: number;
  /**
   * Variação relativa, em porcentagem. `null` quando o período anterior é
   * zero: crescer de 0 para 3 não é "+300%", é "+3" — quem lê decide melhor
   * sem um número inventado.
   */
  variacao: number | null;
  /** Um ponto por dia do período, para o micrográfico. */
  serie: number[];
};

export type Crescimento = {
  /** Rótulos legíveis do eixo, um por ponto. */
  labels: string[];
  empresas: number[];
  receitaCents: number[];
};

export type MetricasDaPlataforma = {
  empresasAtivas: Kpi;
  usuariosAtivos: Kpi;
  mrrCents: Kpi;
  /** Porcentagem de 0 a 100. */
  conversaoTrial: Kpi;
  /** Porcentagem de 0 a 100. */
  churn: Kpi;
  crescimento: Crescimento;
  /** Receita cobrada uma vez só, separada da recorrente (especificação 8.4). */
  receitaAvulsaCents: number;
  geradoEm: string;
};

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

/** Chave estável de dia, em horário local. */
function chaveDia(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Os dias do período, do mais antigo ao mais recente, incluindo hoje.
 *
 * Ancorado ao meio-dia: somar 24h em cima da meia-noite pula ou repete um dia
 * quando o horário de verão entra ou sai.
 */
function diasDoPeriodo(dias: number, fim = new Date()): Date[] {
  const base = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 12);
  const saida: Date[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    saida.push(
      new Date(base.getFullYear(), base.getMonth(), base.getDate() - i, 12)
    );
  }
  return saida;
}

function rotulo(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function variacao(valor: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((valor - anterior) / anterior) * 100;
}

function kpi(serie: number[], anterior: number): Kpi {
  const valor = serie.length > 0 ? serie[serie.length - 1] : 0;
  return { valor, anterior, variacao: variacao(valor, anterior), serie };
}

// ---------------------------------------------------------------------------
// Formas cruas vindas do banco
// ---------------------------------------------------------------------------

type WorkspaceCru = {
  id: string;
  created_at: string;
  suspended: boolean;
  access_expires_at: string | null;
  trial: boolean;
  trial_ends_at: string | null;
  plan_id: string | null;
};

type AssinaturaCrua = {
  workspace_id: string;
  plan_id: string | null;
  status: string;
  updated_at: string;
};

type CobrancaCrua = {
  workspace_id: string;
  amount_cents: number;
  paid_amount_cents: number | null;
  paid_at: string | null;
  status: string;
};

// ---------------------------------------------------------------------------
// Definições
// ---------------------------------------------------------------------------

/**
 * **Empresa ativa**: existe na data, não está suspensa e o acesso não venceu.
 *
 * É uma foto — o valor de cada dia responde "quantas empresas ativas havia
 * naquele dia", não "quantas entraram". Suspensão e vencimento são lidos no
 * estado de hoje: o banco não guarda o histórico desses dois campos, então
 * uma empresa suspensa ontem aparece como suspensa em todo o período. A
 * alternativa honesta seria versionar a tabela; enquanto isso não existe, o
 * gráfico de dias passados erra a favor do presente e está anotado na tela.
 */
function empresasAtivasEm(lista: WorkspaceCru[], dia: Date): number {
  const limite = new Date(
    dia.getFullYear(),
    dia.getMonth(),
    dia.getDate(),
    23,
    59,
    59
  );
  const agora = Date.now();
  return lista.filter((w) => {
    if (new Date(w.created_at).getTime() > limite.getTime()) return false;
    if (w.suspended) return false;
    if (w.access_expires_at && new Date(w.access_expires_at).getTime() < agora)
      return false;
    return true;
  }).length;
}

/**
 * **MRR**: soma mensal das assinaturas recorrentes ativas.
 *
 * Fora da conta: teste gratuito, empresa sem plano e assinatura que não está
 * `ativa`. Cada plano tem um preço mensal (`billing_plan.price_cents`), então
 * a normalização é direta — quando existir plano anual ou vitalício, este é o
 * ponto que precisa dividir por 12 ou sair da conta.
 */
function mrrDe(
  workspaces: WorkspaceCru[],
  assinaturas: Map<string, AssinaturaCrua>,
  precos: Map<string, number>
): number {
  let total = 0;
  for (const w of workspaces) {
    if (w.trial || w.suspended) continue;
    const a = assinaturas.get(w.id);
    if (!a || a.status !== "ativa") continue;
    const planId = a.plan_id ?? w.plan_id;
    if (!planId) continue;
    total += precos.get(planId) ?? 0;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

async function carregarBase() {
  const db = createAdminClient();

  const [ws, assin, planos] = await Promise.all([
    db
      .from("workspace")
      .select(
        "id, created_at, suspended, access_expires_at, trial, trial_ends_at, plan_id"
      ),
    db.from("subscription").select("workspace_id, plan_id, status, updated_at"),
    db.from("billing_plan").select("id, price_cents"),
  ]);

  const workspaces = (ws.data ?? []) as WorkspaceCru[];
  const assinaturas = new Map<string, AssinaturaCrua>(
    ((assin.data ?? []) as AssinaturaCrua[]).map((a) => [a.workspace_id, a])
  );
  const precos = new Map<string, number>(
    ((planos.data ?? []) as { id: string; price_cents: number }[]).map((p) => [
      p.id,
      p.price_cents,
    ])
  );

  return { db, workspaces, assinaturas, precos };
}

// ---------------------------------------------------------------------------
// Métricas
// ---------------------------------------------------------------------------

export async function platformMetrics(
  janela: Janela
): Promise<MetricasDaPlataforma> {
  const { db, workspaces, assinaturas, precos } = await carregarBase();

  const dias = diasDoPeriodo(janela);
  const inicio = dias[0];
  const anteriorInicio = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate() - janela,
    12
  );

  // --- Empresas ativas -----------------------------------------------------
  const serieEmpresas = dias.map((d) => empresasAtivasEm(workspaces, d));
  const empresasAntes = empresasAtivasEm(
    workspaces,
    new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() - 1, 12)
  );

  // --- Usuários ativos -----------------------------------------------------
  //
  // **Usuário ativo**: mexeu em alguma demanda dentro da janela. É o sinal de
  // atividade que o banco realmente guarda (`task_activity`), e não "abriu o
  // app" — quem só leu não conta. Está escrito na dica da tela para ninguém
  // comparar este número com sessões.
  const { data: atividade } = await db
    .from("task_activity")
    .select("changed_by, created_at")
    .gte("created_at", anteriorInicio.toISOString())
    .not("changed_by", "is", null);

  const eventos = (atividade ?? []) as {
    changed_by: string;
    created_at: string;
  }[];
  const inicioMs = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate()
  ).getTime();

  const ativosPorDia = dias.map((d) => {
    const limite = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59
    ).getTime();
    const desde = new Date(limite).getTime() - janela * 86_400_000;
    const set = new Set<string>();
    for (const e of eventos) {
      const t = new Date(e.created_at).getTime();
      if (t >= desde && t <= limite) set.add(e.changed_by);
    }
    return set.size;
  });

  const ativosAntes = new Set(
    eventos
      .filter((e) => new Date(e.created_at).getTime() < inicioMs)
      .map((e) => e.changed_by)
  ).size;

  // --- MRR -----------------------------------------------------------------
  //
  // O MRR de hoje é um estado, não uma série histórica: o banco não guarda
  // qual plano cada empresa tinha em cada dia. A série mostra a receita
  // efetivamente PAGA por dia, que é histórico de verdade; o valor grande do
  // cartão é o MRR corrente.
  const mrrHoje = mrrDe(workspaces, assinaturas, precos);

  const { data: cobrancas } = await db
    .from("subscription_charge")
    .select("workspace_id, amount_cents, paid_amount_cents, paid_at, status")
    .gte("paid_at", anteriorInicio.toISOString());

  const pagas = ((cobrancas ?? []) as CobrancaCrua[]).filter(
    (c) => c.status === "paga" && c.paid_at
  );

  const receitaPorDia = dias.map((d) => {
    const chave = chaveDia(d);
    return pagas
      .filter((c) => chaveDia(new Date(c.paid_at as string)) === chave)
      .reduce((s, c) => s + (c.paid_amount_cents ?? c.amount_cents), 0);
  });

  const mrrAnterior = pagas
    .filter((c) => new Date(c.paid_at as string).getTime() < inicioMs)
    .reduce((s, c) => s + (c.paid_amount_cents ?? c.amount_cents), 0);

  // Receita não recorrente: cobrança paga por empresa que não tem assinatura
  // ativa. Não entra no MRR (especificação 8.4).
  const receitaAvulsaCents = pagas
    .filter((c) => {
      if (new Date(c.paid_at as string).getTime() < inicioMs) return false;
      return assinaturas.get(c.workspace_id)?.status !== "ativa";
    })
    .reduce((s, c) => s + (c.paid_amount_cents ?? c.amount_cents), 0);

  // --- Conversão do teste --------------------------------------------------
  //
  // **Conversão**: dos testes que TERMINARAM no período (`trial_ends_at`
  // dentro da janela), quantos hoje têm assinatura ativa. Divisor zero =
  // nenhum teste venceu no período: o cartão mostra "—", não 0%.
  function conversaoEntre(de: Date, ate: Date): number {
    const deMs = de.getTime();
    const ateMs = ate.getTime();
    const encerrados = workspaces.filter((w) => {
      if (!w.trial_ends_at) return false;
      const t = new Date(w.trial_ends_at).getTime();
      return t >= deMs && t <= ateMs;
    });
    if (encerrados.length === 0) return 0;
    const viraram = encerrados.filter(
      (w) => assinaturas.get(w.id)?.status === "ativa"
    ).length;
    return (viraram / encerrados.length) * 100;
  }

  const fim = new Date(
    dias[dias.length - 1].getFullYear(),
    dias[dias.length - 1].getMonth(),
    dias[dias.length - 1].getDate(),
    23,
    59,
    59
  );
  const conversaoHoje = conversaoEntre(inicio, fim);
  const conversaoAntes = conversaoEntre(anteriorInicio, inicio);
  const serieConversao = dias.map((d) =>
    conversaoEntre(
      new Date(d.getFullYear(), d.getMonth(), d.getDate() - janela, 12),
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    )
  );

  // --- Churn ---------------------------------------------------------------
  //
  // **Churn**: assinaturas canceladas no período ÷ assinaturas pagas no
  // início do período.
  //
  // RESSALVA: a data do cancelamento sai de `subscription.updated_at`, que é
  // "última alteração", não "cancelou nesta data". Uma assinatura cancelada e
  // depois tocada por outro motivo carrega a data errada. É a melhor
  // aproximação com o schema atual; corrigir de verdade pede uma coluna
  // `canceled_at`, anotada como pendência.
  function churnEntre(de: Date, ate: Date): number {
    const deMs = de.getTime();
    const ateMs = ate.getTime();
    const todas = [...assinaturas.values()];
    const pagasNoInicio = todas.filter(
      (a) => a.status === "ativa" || new Date(a.updated_at).getTime() >= deMs
    ).length;
    if (pagasNoInicio === 0) return 0;
    const canceladas = todas.filter((a) => {
      if (a.status !== "cancelada") return false;
      const t = new Date(a.updated_at).getTime();
      return t >= deMs && t <= ateMs;
    }).length;
    return (canceladas / pagasNoInicio) * 100;
  }

  const churnHoje = churnEntre(inicio, fim);
  const churnAntes = churnEntre(anteriorInicio, inicio);
  const serieChurn = dias.map((d) =>
    churnEntre(
      new Date(d.getFullYear(), d.getMonth(), d.getDate() - janela, 12),
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    )
  );

  return {
    empresasAtivas: kpi(serieEmpresas, empresasAntes),
    usuariosAtivos: kpi(ativosPorDia, ativosAntes),
    mrrCents: {
      valor: mrrHoje,
      anterior: mrrAnterior,
      variacao: variacao(mrrHoje, mrrAnterior),
      serie: receitaPorDia,
    },
    conversaoTrial: {
      valor: conversaoHoje,
      anterior: conversaoAntes,
      variacao: variacao(conversaoHoje, conversaoAntes),
      serie: serieConversao,
    },
    churn: {
      valor: churnHoje,
      anterior: churnAntes,
      variacao: variacao(churnHoje, churnAntes),
      serie: serieChurn,
    },
    crescimento: {
      labels: dias.map(rotulo),
      empresas: serieEmpresas,
      receitaCents: receitaPorDia,
    },
    receitaAvulsaCents,
    geradoEm: new Date().toISOString(),
  };
}
