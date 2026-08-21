import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import type { AffiliateRow } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cadastro de afiliados, só para o dono da plataforma.
 *
 * A comissão exibida sai de cobrança PAGA, não de assinatura ativa: só há o
 * que repassar depois que o dinheiro entrou. O percentual aplicado é o que
 * ficou gravado na empresa no dia da indicação (`workspace.affiliate_percent`),
 * não o percentual atual do afiliado — mudar a tabela não reescreve acordo.
 */

type AfiliadoEntrada = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  code?: string;
  commission_percent?: number;
  active?: boolean;
  notes?: string | null;
};

// Mesma forma exigida pelo check da tabela: minúsculas, número e hífen.
function normalizarCodigo(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validar(body: AfiliadoEntrada): string | null {
  if (!body.name?.trim()) return "nome obrigatório";
  if (body.name.trim().length > 120) return "nome muito longo";
  const code = normalizarCodigo(body.code ?? "");
  if (code.length < 3 || code.length > 32) {
    return "link precisa de 3 a 32 letras, números ou hífen";
  }
  const pct = body.commission_percent;
  if (
    typeof pct !== "number" ||
    !Number.isInteger(pct) ||
    pct < 0 ||
    pct > 100
  ) {
    return "comissão precisa ser um número inteiro de 0 a 100";
  }
  return null;
}

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  const [{ data: afiliados, error }, { data: cliques }, { data: empresas }] =
    await Promise.all([
      db.from("affiliate").select("*").order("created_at", { ascending: true }),
      db.from("affiliate_click").select("affiliate_id"),
      db
        .from("workspace")
        .select("id, affiliate_id, affiliate_percent")
        .not("affiliate_id", "is", null),
    ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cliquesPor = new Map<string, number>();
  for (const c of cliques ?? []) {
    cliquesPor.set(c.affiliate_id, (cliquesPor.get(c.affiliate_id) ?? 0) + 1);
  }

  const empresasPor = new Map<string, number>();
  const percentPorWs = new Map<string, { afiliado: string; pct: number }>();
  for (const w of empresas ?? []) {
    const id = w.affiliate_id as string;
    empresasPor.set(id, (empresasPor.get(id) ?? 0) + 1);
    percentPorWs.set(w.id, { afiliado: id, pct: w.affiliate_percent ?? 0 });
  }

  // Comissão sobre o que já foi pago.
  const comissaoPor = new Map<string, number>();
  if (percentPorWs.size > 0) {
    const { data: pagas } = await db
      .from("subscription_charge")
      .select("workspace_id, paid_amount_cents, amount_cents")
      .eq("status", "paga")
      .in("workspace_id", [...percentPorWs.keys()]);
    for (const c of pagas ?? []) {
      const ref = percentPorWs.get(c.workspace_id);
      if (!ref) continue;
      const valor = c.paid_amount_cents ?? c.amount_cents;
      const comissao = Math.round((valor * ref.pct) / 100);
      comissaoPor.set(
        ref.afiliado,
        (comissaoPor.get(ref.afiliado) ?? 0) + comissao
      );
    }
  }

  const rows: AffiliateRow[] = (afiliados ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    code: a.code,
    commission_percent: a.commission_percent,
    active: a.active,
    notes: a.notes,
    click_count: cliquesPor.get(a.id) ?? 0,
    workspace_count: empresasPor.get(a.id) ?? 0,
    commission_cents: comissaoPor.get(a.id) ?? 0,
    created_at: a.created_at,
  }));

  return NextResponse.json({ affiliates: rows });
}

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: AfiliadoEntrada;
  try {
    body = (await request.json()) as AfiliadoEntrada;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const erro = validar(body);
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from("affiliate").insert({
    name: body.name!.trim(),
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    code: normalizarCodigo(body.code!),
    commission_percent: body.commission_percent!,
    notes: body.notes ?? null,
  });
  if (error) {
    // 23505 = unique_violation: o link já é de outro afiliado.
    const code = (error as { code?: string }).code;
    return NextResponse.json(
      { error: code === "23505" ? "code_taken" : error.message },
      { status: code === "23505" ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: AfiliadoEntrada & { id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  const erro = validar(body);
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from("affiliate")
    .update({
      name: body.name!.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      code: normalizarCodigo(body.code!),
      commission_percent: body.commission_percent!,
      active: body.active ?? true,
      notes: body.notes ?? null,
    })
    .eq("id", body.id);
  if (error) {
    const code = (error as { code?: string }).code;
    return NextResponse.json(
      { error: code === "23505" ? "code_taken" : error.message },
      { status: code === "23505" ? 409 : 500 }
    );
  }

  // Mudar o percentual vale para indicações novas. As empresas já indicadas
  // guardam o percentual do dia em que chegaram.
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = createAdminClient();

  // Afiliado com empresa indicada não some: o histórico de quem trouxe quem
  // sumiria junto. Desativar tira o link do ar e mantém o registro.
  const { data: emUso } = await db
    .from("workspace")
    .select("id")
    .eq("affiliate_id", id)
    .limit(1);
  if (emUso && emUso.length > 0) {
    return NextResponse.json({ error: "affiliate_in_use" }, { status: 409 });
  }

  const { error } = await db.from("affiliate").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
