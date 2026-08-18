import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Leitura pública de uma demanda por token de compartilhamento.
 *
 * Este arquivo é a fronteira de segurança do link público, e por isso tem
 * três travas explícitas:
 *
 * 1. `server-only`: importar isto de um componente de cliente quebra o
 *    build. A chave secreta nunca chega ao navegador.
 *
 * 2. A resposta é montada CAMPO A CAMPO num tipo próprio. Nada de devolver
 *    a linha do banco e "esconder" o resto na interface — máscara visual
 *    não é controle de acesso (§15). O que não está em `PublicTaskView`
 *    não sai daqui, nem por engano futuro.
 *
 * 3. Comentários, anexos, tempo registrado, histórico, valores e as demais
 *    demandas do setor NÃO entram. O cliente pediu para acompanhar UMA
 *    demanda; conversa de equipe é interna.
 */

export type PublicSubtask = {
  title: string;
  done: boolean;
};

export type PublicTaskView = {
  title: string;
  description: string | null;
  sectorName: string | null;
  /** "aberta" | "concluida" | "cancelada" — sem vocabulário interno. */
  state: "aberta" | "concluida" | "cancelada";
  dueDate: string | null;
  /** Nome de quem responde. Sem e-mail, sem id. */
  assigneeName: string | null;
  subtasks: PublicSubtask[];
  updatedAt: string;
  /** Nome da organização que compartilhou, para o visitante se situar. */
  orgName: string | null;
};

export type ShareResult =
  | { ok: true; view: PublicTaskView }
  | { ok: false; reason: "inexistente" | "revogado" | "expirado" };

export async function readSharedTask(token: string): Promise<ShareResult> {
  // Token com formato errado nem chega ao banco.
  if (!/^[0-9a-f]{32,80}$/.test(token)) return { ok: false, reason: "inexistente" };

  const db = createAdminClient();

  const { data: link } = await db
    .from("share_link")
    .select("entity_id, workspace_id, revoked_at, expires_at, entity_type")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.entity_type !== "task") {
    return { ok: false, reason: "inexistente" };
  }
  if (link.revoked_at) return { ok: false, reason: "revogado" };
  if (new Date(link.expires_at) <= new Date()) {
    return { ok: false, reason: "expirado" };
  }

  const { data: task } = await db
    .from("task")
    .select(
      "title, description, due_date, completed_at, cancelled_at, updated_at, sector_id, assignee_id, workspace_id"
    )
    .eq("id", link.entity_id)
    .maybeSingle();

  // Demanda apagada depois do link criado — o link some junto, sem erro feio.
  if (!task) return { ok: false, reason: "inexistente" };
  // Cinto e suspensório: o link só vale dentro do workspace que o criou.
  if (task.workspace_id !== link.workspace_id) {
    return { ok: false, reason: "inexistente" };
  }

  const [{ data: sector }, { data: assignee }, { data: subtasks }, { data: org }] =
    await Promise.all([
      task.sector_id
        ? db.from("sector").select("name").eq("id", task.sector_id).maybeSingle()
        : Promise.resolve({ data: null }),
      task.assignee_id
        ? db
            .from("app_user")
            .select("display_name")
            .eq("id", task.assignee_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      db
        .from("subtask")
        .select("title, completed_at")
        .eq("task_id", link.entity_id)
        .order("position", { ascending: true }),
      db
        .from("workspace")
        .select("name")
        .eq("id", link.workspace_id)
        .maybeSingle(),
    ]);

  return {
    ok: true,
    view: {
      title: task.title,
      description: task.description,
      sectorName: sector?.name ?? null,
      state: task.cancelled_at
        ? "cancelada"
        : task.completed_at
          ? "concluida"
          : "aberta",
      dueDate: task.due_date,
      // display_name e não e-mail: e-mail é dado pessoal e não ajuda o
      // visitante em nada.
      assigneeName: assignee?.display_name ?? null,
      subtasks: (subtasks ?? []).map((s) => ({ title: s.title, done: s.completed_at !== null })),
      updatedAt: task.updated_at,
      orgName: org?.name ?? null,
    },
  };
}
