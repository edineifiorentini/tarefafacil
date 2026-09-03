import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { escopoDe, tarefasDoEscopo } from "@/lib/notifications/escalation";
import { createClient } from "@/lib/supabase/server";
import {
  gargalosDoFluxo,
  type ColunaDoQuadro,
  type MovimentoDeColuna,
} from "@/lib/reports/gargalos";
import { aplicarFiltro } from "@/lib/reports/overview";
import type { Task } from "@/types/database";

/**
 * Onde o trabalho está parado — calculado no SERVIDOR.
 *
 * **Esta é a única parte do relatório que precisa de rota própria**, e a
 * razão é o volume. Tudo o mais sai das demandas que o aplicativo já tem em
 * cache (`useTasks`), então calcular no navegador não custa uma requisição
 * sequer. `task_activity` é diferente: é uma linha por movimentação de
 * QUALQUER demanda desde a migration 0025, e mandá-la inteira para o
 * navegador para descobrir cinco números seria trocar um payload de
 * kilobytes por um de megabytes.
 *
 * Sai daqui só o agregado: cinco etapas com contagem e média. A atividade
 * crua não cruza a rede.
 *
 * **Sem chave secreta.** Roda com a sessão de quem pediu, e a RLS de
 * `task_activity` (`is_member`) já limita ao workspace. Sobre ela vai o
 * escopo do produto (`escopoDe`, 0082): dono e admin veem tudo, gestor vê
 * os setores que responde. É a mesma regra das outras abas — duas regras de
 * visibilidade para o mesmo relatório seria como uma delas ficar
 * desatualizada.
 */

export const dynamic = "force-dynamic";

/** Lotes do `in (...)`: id de mais numa URL vira 414 em vez de resposta. */
const LOTE = 200;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // O workspace ATIVO, não o primeiro. Quem tem duas empresas e trocou de
  // uma para a outra veria o relatório da errada — e os números pareceriam
  // apenas estranhos, não errados, que é o pior tipo de defeito.
  const cookieStore = await cookies();
  const ativo = cookieStore.get("active_workspace")?.value;
  const { data: workspaces } = await supabase
    .from("workspace")
    .select("id")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  const workspaceId =
    workspaces?.find((w) => w.id === ativo)?.id ?? workspaces?.[0]?.id;
  if (!workspaceId) {
    return NextResponse.json({ error: "sem_workspace" }, { status: 404 });
  }

  const url = new URL(request.url);
  const lista = (chave: string) =>
    (url.searchParams.get(chave) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const [setoresRes, membrosRes, colunasRes, abertasRes] = await Promise.all([
    supabase
      .from("sector")
      .select("id, responsavel_id")
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_member")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("board_column")
      .select("id, name, position, is_done_column")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true }),
    // Só as ABERTAS, e só as colunas de que o cálculo precisa. Demanda
    // concluída não está parada em lugar nenhum.
    supabase
      .from("task")
      .select("id, sector_id, assignee_id, column_id, created_at, completed_at, cancelled_at")
      .eq("workspace_id", workspaceId)
      .is("completed_at", null)
      .is("cancelled_at", null),
  ]);

  const setores = (setoresRes.data ?? []) as {
    id: string;
    responsavel_id: string | null;
  }[];
  const papel = (membrosRes.data as { role: string } | null)?.role;

  const escopo = escopoDe(
    user.id,
    papel as Parameters<typeof escopoDe>[1],
    setores as Parameters<typeof escopoDe>[2]
  );
  const noEscopo = tarefasDoEscopo(
    (abertasRes.data ?? []) as unknown as Task[],
    escopo,
    user.id
  );
  const abertas = aplicarFiltro(noEscopo, {
    sectorIds: lista("setores"),
    assigneeIds: lista("responsaveis"),
  });

  // A atividade só das demandas que sobraram, em lotes. Puxar a tabela
  // inteira funcionaria hoje e pararia de funcionar sozinho no dia em que
  // o histórico crescesse — sem ninguém mudar nada.
  const ids = abertas.map((t) => t.id);
  const movimentos: MovimentoDeColuna[] = [];
  for (let i = 0; i < ids.length; i += LOTE) {
    const { data } = await supabase
      .from("task_activity")
      .select("task_id, new_value, created_at")
      .eq("field", "column_id")
      .in("task_id", ids.slice(i, i + LOTE));
    if (data) movimentos.push(...(data as MovimentoDeColuna[]));
  }

  const etapas = gargalosDoFluxo(
    abertas,
    (colunasRes.data ?? []) as ColunaDoQuadro[],
    movimentos,
    new Date()
  );

  return NextResponse.json({
    etapas,
    /**
     * Quantas das abertas nunca se moveram desde que foram criadas.
     *
     * A tela usa isto para dizer a verdade sobre o tempo de etapa: para
     * essas, "parada há N dias" conta desde a CRIAÇÃO, porque o gatilho da
     * 0025 é `after update` e a coluna inicial não gera registro. Sem esse
     * aviso, o número parece mais preciso do que é.
     */
    semHistorico: abertas.filter(
      (t) => !movimentos.some((m) => m.task_id === t.id)
    ).length,
    totalAbertas: abertas.length,
  });
}
