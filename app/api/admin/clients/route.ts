import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import type { ClientRow } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/types/database";

// Lista todos os workspaces (clientes) com plano, assentos e nº de membros.
export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = createAdminClient();
  const [{ data: workspaces }, { data: members }, { data: users }] =
    await Promise.all([
      db
        .from("workspace")
        .select(
          "id, name, plan, seat_limit, access_expires_at, suspended, owner_user_id, created_at"
        )
        .order("created_at", { ascending: true }),
      db.from("workspace_member").select("workspace_id"),
      db.from("app_user").select("id, email"),
    ]);

  const emailById = new Map((users ?? []).map((u) => [u.id, u.email]));
  const countByWs = new Map<string, number>();
  for (const m of members ?? []) {
    countByWs.set(m.workspace_id, (countByWs.get(m.workspace_id) ?? 0) + 1);
  }

  const rows: ClientRow[] = (workspaces ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    plan: w.plan,
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
    created_at: w.created_at,
  }));

  return NextResponse.json({ clients: rows });
}

// Atualiza plano e/ou limite de assentos de um workspace.
export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    workspaceId?: string;
    seat_limit?: number;
    plan?: Plan;
    access_expires_at?: string | null;
    suspended?: boolean;
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
    plan?: Plan;
    access_expires_at?: string | null;
    suspended?: boolean;
  } = {};
  if (typeof body.seat_limit === "number") {
    patch.seat_limit = Math.max(1, Math.floor(body.seat_limit));
  }
  if (body.plan) patch.plan = body.plan;
  if ("access_expires_at" in body) {
    patch.access_expires_at = body.access_expires_at ?? null;
  }
  if (typeof body.suspended === "boolean") patch.suspended = body.suspended;

  const db = createAdminClient();
  const { error } = await db
    .from("workspace")
    .update(patch)
    .eq("id", body.workspaceId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Remove um cliente (workspace) e todos os dados dele (cascata). Irreversível.
// Não apaga a conta de login do dono — só o workspace/tenant.
export async function DELETE(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing_workspace" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("workspace").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
