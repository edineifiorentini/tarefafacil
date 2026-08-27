import { NextResponse } from "next/server";

import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import { requirePlatformAdmin } from "@/lib/admin/admin";
import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { DIAS_ATE_REMOCAO_FISICA } from "@/lib/admin/company";
import type { ClientRow } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Cadastra um cliente: cria o workspace e atribui o dono (por e-mail).
// O dono precisa já ter conta (pode se cadastrar antes). Acesso imediato.
export async function POST(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    name?: string;
    owner_email?: string;
    plan_id?: string | null;
    trial?: boolean;
    contact_email?: string | null;
    contact_phone?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const name = body.name?.trim();
  const email = body.owner_email?.trim();
  if (!name || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: owner } = await db
    .from("app_user")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (!owner) {
    return NextResponse.json({ error: "owner_not_found" }, { status: 404 });
  }

  // Plano escolhido no cadastro define os assentos — é o que o plano vende.
  let seatLimit: number | undefined;
  if (body.plan_id) {
    const { data: plano } = await db
      .from("billing_plan")
      .select("max_users")
      .eq("id", body.plan_id)
      .maybeSingle();
    if (!plano) {
      return NextResponse.json({ error: "plan_not_found" }, { status: 400 });
    }
    seatLimit = plano.max_users;
  }

  const { data: ws, error } = await db
    .from("workspace")
    .insert({
      name,
      owner_user_id: owner.id,
      plan_id: body.plan_id ?? null,
      trial: body.trial ?? false,
      contact_email: body.contact_email?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      ...(seatLimit ? { seat_limit: seatLimit } : {}),
    })
    .select("id")
    .single();
  if (error || !ws) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  const { error: memberError } = await db.from("workspace_member").insert({
    workspace_id: ws.id,
    user_id: owner.id,
    role: "owner",
    status: "active",
  });
  if (memberError) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Lista todos os workspaces (clientes) com plano, assentos e nº de membros.
export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = createAdminClient();
  const [
    { data: workspaces },
    { data: members },
    { data: users },
    { data: plans },
  ] = await Promise.all([
    db
      .from("workspace")
      .select(
        "id, name, plan_id, trial, seat_limit, access_expires_at, suspended, owner_user_id, contact_email, contact_phone, created_at"
      )
      .order("created_at", { ascending: true }),
    db.from("workspace_member").select("workspace_id"),
    db.from("app_user").select("id, email"),
    db.from("billing_plan").select("id, name"),
  ]);

  const emailById = new Map((users ?? []).map((u) => [u.id, u.email]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name]));
  const countByWs = new Map<string, number>();
  for (const m of members ?? []) {
    countByWs.set(m.workspace_id, (countByWs.get(m.workspace_id) ?? 0) + 1);
  }

  const rows: ClientRow[] = (workspaces ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    plan_id: w.plan_id,
    plan_name: w.plan_id ? (planNameById.get(w.plan_id) ?? null) : null,
    trial: w.trial,
    seat_limit: w.seat_limit,
    access_expires_at: w.access_expires_at,
    expired:
      !!w.access_expires_at &&
      new Date(w.access_expires_at).getTime() < Date.now(),
    suspended: w.suspended,
    member_count: countByWs.get(w.id) ?? 0,
    owner_email: w.owner_user_id
      ? (emailById.get(w.owner_user_id) ?? null)
      : null,
    contact_email: w.contact_email,
    contact_phone: w.contact_phone,
    created_at: w.created_at,
  }));

  return NextResponse.json({ clients: rows });
}

// Atualiza plano, assentos, acesso e contato de um workspace.
export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    workspaceId?: string;
    seat_limit?: number;
    plan_id?: string | null;
    trial?: boolean;
    access_expires_at?: string | null;
    suspended?: boolean;
    contact_email?: string | null;
    contact_phone?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.workspaceId) {
    return NextResponse.json({ error: "missing_workspace" }, { status: 400 });
  }

  const patch: {
    seat_limit?: number;
    plan_id?: string | null;
    trial?: boolean;
    access_expires_at?: string | null;
    suspended?: boolean;
    contact_email?: string | null;
    contact_phone?: string | null;
  } = {};
  if (typeof body.seat_limit === "number") {
    patch.seat_limit = Math.max(1, Math.floor(body.seat_limit));
  }
  if ("plan_id" in body) {
    patch.plan_id = body.plan_id ?? null;
    // Trocar de plano leva os assentos do plano junto — a não ser que o
    // admin tenha digitado um número na mesma ação, que aí vale o dele.
    if (body.plan_id && typeof body.seat_limit !== "number") {
      const db = createAdminClient();
      const { data: plano } = await db
        .from("billing_plan")
        .select("max_users")
        .eq("id", body.plan_id)
        .maybeSingle();
      if (!plano) {
        return NextResponse.json({ error: "plan_not_found" }, { status: 400 });
      }
      patch.seat_limit = plano.max_users;
    }
  }
  if (typeof body.trial === "boolean") patch.trial = body.trial;
  if ("access_expires_at" in body) {
    patch.access_expires_at = body.access_expires_at ?? null;
  }
  if (typeof body.suspended === "boolean") patch.suspended = body.suspended;
  if ("contact_email" in body) {
    patch.contact_email = body.contact_email?.trim() || null;
  }
  if ("contact_phone" in body) {
    patch.contact_phone = body.contact_phone?.trim() || null;
  }

  const db = createAdminClient();
  // Devolve o que ficou gravado: trocar de plano pode ter mexido nos
  // assentos, e a tela precisa mostrar o número novo sem o admin recarregar.
  const { data, error } = await db
    .from("workspace")
    .update(patch)
    .eq("id", body.workspaceId)
    .select("seat_limit, plan_id, trial")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, workspace: data });
}

/**
 * Remoção FÍSICA de um cliente. Cascateia para tudo: demandas, anexos,
 * conversas e a auditoria da empresa. Não apaga a conta de login do dono.
 *
 * Esta rota deixou de ser o botão "excluir" do painel. Excluir passou a ser
 * lógico (`deleted_at`, migration 0073) e reversível; aqui é só o expurgo
 * do que já foi excluído e cumpriu a quarentena.
 *
 * Duas travas, porque antes não havia nenhuma:
 *
 * 1. A empresa precisa estar excluída logicamente há mais de
 *    DIAS_ATE_REMOCAO_FISICA. É a política de retenção que a restrição 33
 *    da especificação exige.
 * 2. Motivo obrigatório, validado aqui, e registrado na auditoria ANTES do
 *    delete — depois seria tarde: a linha do log da empresa morre no
 *    cascade junto com ela. O evento de plataforma sobrevive porque grava
 *    `workspace_id = null`.
 */
export async function DELETE(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const motivo = (url.searchParams.get("motivo") ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "missing_workspace" }, { status: 400 });
  }
  if (motivo.length < MOTIVO_MINIMO) {
    return NextResponse.json(
      {
        error: "motivo_invalido",
        message: `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`,
      },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const { data: empresa } = await db
    .from("workspace")
    .select("name, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!empresa) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!empresa.deleted_at) {
    return NextResponse.json(
      {
        error: "nao_excluida",
        message:
          "Exclua a empresa primeiro; a remoção definitiva só vem depois da quarentena",
      },
      { status: 409 }
    );
  }

  const diasNaQuarentena =
    (Date.now() - new Date(empresa.deleted_at).getTime()) / 86_400_000;
  if (diasNaQuarentena < DIAS_ATE_REMOCAO_FISICA) {
    const faltam = Math.ceil(DIAS_ATE_REMOCAO_FISICA - diasNaQuarentena);
    return NextResponse.json(
      {
        error: "quarentena",
        message: `Faltam ${faltam} dias de quarentena antes da remoção definitiva`,
      },
      { status: 409 }
    );
  }

  // Antes do delete: depois desta linha não há mais empresa para nomear.
  await registrarEventoDePlataforma({
    autor: admin.email,
    acao: "excluiu",
    entidade: "workspace",
    entidadeId: id,
    resumo: `removeu definitivamente a empresa "${empresa.name}" e todos os dados dela`,
    detalhes: { motivo, empresa: empresa.name, excluidaEm: empresa.deleted_at },
  });

  const { error } = await db.from("workspace").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
