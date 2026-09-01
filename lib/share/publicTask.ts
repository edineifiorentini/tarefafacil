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
 * 3. Comentários, tempo registrado, histórico, valores e as demais demandas
 *    do setor NÃO entram. O cliente pediu para acompanhar UMA demanda;
 *    conversa de equipe é interna.
 *
 * **Anexos entram desde a 0083, e só os marcados `entregavel`.** Era uma
 * exclusão total até 31/ago/2026, quando o dono apontou o buraco: o cliente
 * aprovava uma peça que não estava na tela, tendo visto por outro canal — o
 * WhatsApp que a §18 queria eliminar. A regra continua estreita: publicar é
 * ato explícito por arquivo, e mesmo assim daqui sai só METADADO. O
 * `storage_key` nunca cruza esta fronteira; quem o resolve é a rota
 * `/api/d/[token]/anexo/[id]`, que confere o token de novo.
 */

export type PublicSubtask = {
  title: string;
  done: boolean;
};

/**
 * Um entregável, do jeito que o visitante pode conhecê-lo.
 *
 * **Sem `storage_key`, e é o ponto todo.** O id serve para pedir o arquivo à
 * rota, que confere o token outra vez antes de assinar uma URL de cinco
 * minutos. Mandar a chave do storage daqui transformaria "ver a peça" em
 * "ter o arquivo para sempre".
 */
export type PublicDeliverable = {
  id: string;
  filename: string;
  /** Decide se a peça é desenhada na tela ou apenas listada. */
  mimeType: string | null;
  isImage: boolean;
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
  /** Só os anexos marcados como entregáveis (0083). Metadado, sem chave. */
  entregaveis: PublicDeliverable[];
  updatedAt: string;
  /** Nome da organização que compartilhou, para o visitante se situar. */
  orgName: string | null;
  /** A última resposta deste link, para a caixa não fingir que é a primeira. */
  lastDecision: "aprovado" | "ajuste" | null;
  lastDecisionAt: string | null;
};

export type ShareResult =
  | { ok: true; view: PublicTaskView }
  | { ok: false; reason: "inexistente" | "revogado" | "expirado" };

export async function readSharedTask(token: string): Promise<ShareResult> {
  // Token com formato errado nem chega ao banco.
  if (!/^[0-9a-f]{32,80}$/.test(token))
    return { ok: false, reason: "inexistente" };

  const db = createAdminClient();

  const { data: link } = await db
    .from("share_link")
    .select("id, entity_id, workspace_id, revoked_at, expires_at, entity_type")
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

  const [
    { data: sector },
    { data: assignee },
    { data: subtasks },
    { data: anexos },
    { data: org },
    { data: ultima },
  ] = await Promise.all([
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
    // Só `entregavel`. O filtro é aqui, no servidor, e não na tela: máscara
    // visual não é controle de acesso (§15).
    db
      .from("attachment")
      .select("id, filename, mime_type, kind")
      .eq("task_id", link.entity_id)
      .eq("entregavel", true)
      .eq("kind", "file")
      .order("created_at", { ascending: true }),
    db
      .from("workspace")
      .select("name")
      .eq("id", link.workspace_id)
      .maybeSingle(),
    // A última resposta DESTE link. De outro link não interessa: quem abre
    // só precisa saber o que ele mesmo já respondeu.
    db
      .from("task_approval")
      .select("decision, created_at")
      .eq("share_link_id", link.id)
      .order("created_at", { ascending: false })
      .limit(1)
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
      subtasks: (subtasks ?? []).map((s) => ({
        title: s.title,
        done: s.completed_at !== null,
      })),
      entregaveis: (anexos ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mime_type,
        // Decidido pelo mime do banco, não pela extensão do nome: nome de
        // arquivo é digitado por gente e mente com frequência.
        isImage: (a.mime_type ?? "").startsWith("image/"),
      })),
      updatedAt: task.updated_at,
      orgName: org?.name ?? null,
      lastDecision: (ultima?.decision as "aprovado" | "ajuste") ?? null,
      lastDecisionAt: ultima?.created_at ?? null,
    },
  };
}
