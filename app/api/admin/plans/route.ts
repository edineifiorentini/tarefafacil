import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cadastro de planos, só para o dono da plataforma.
 *
 * Roda no servidor com a chave secreta pelo mesmo motivo do resto de
 * `/api/admin`: quem administra a plataforma não é membro dos workspaces
 * que administra, então a RLS por membro não o alcançaria.
 */

type PlanoEntrada = {
  name?: string;
  price_cents?: number;
  max_users?: number;
  is_public?: boolean;
  active?: boolean;
  notes?: string | null;
};

function validar(body: PlanoEntrada): string | null {
  const nome = body.name?.trim();
  if (!nome) return "nome obrigatório";
  if (nome.length > 80) return "nome muito longo";
  if (typeof body.price_cents !== "number" || body.price_cents < 0) {
    return "valor inválido";
  }
  // Centavos são inteiros. Um float aqui vira dízima na fatura.
  if (!Number.isInteger(body.price_cents)) return "valor deve ser em centavos";
  if (typeof body.max_users !== "number" || body.max_users < 1) {
    return "máximo de usuários inválido";
  }
  return null;
}

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("billing_plan")
    .select("*")
    .order("price_cents", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Quantas empresas usam cada plano — é o que decide se dá para apagar.
  const { data: usos } = await db
    .from("workspace")
    .select("plan_id")
    .not("plan_id", "is", null);
  const contagem = new Map<string, number>();
  for (const u of usos ?? []) {
    const id = u.plan_id as string;
    contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }

  return NextResponse.json({
    plans: (data ?? []).map((p) => ({
      ...p,
      workspace_count: contagem.get(p.id) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: PlanoEntrada;
  try {
    body = (await request.json()) as PlanoEntrada;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const erro = validar(body);
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("billing_plan")
    .insert({
      name: body.name!.trim(),
      price_cents: body.price_cents!,
      max_users: body.max_users!,
      is_public: body.is_public ?? false,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plan: data });
}

export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: PlanoEntrada & { id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.id)
    return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const erro = validar(body);
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from("billing_plan")
    .update({
      name: body.name!.trim(),
      price_cents: body.price_cents!,
      max_users: body.max_users!,
      is_public: body.is_public ?? false,
      active: body.active ?? true,
      notes: body.notes ?? null,
    })
    .eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Editar o preço NÃO mexe em fatura já emitida: `subscription_charge`
  // guarda cópia do nome e do valor. Editar aqui vale do próximo ciclo em
  // diante, que é o que se espera de tabela de preço.
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = createAdminClient();

  // Plano em uso não some: a empresa ficaria sem plano sem ninguém decidir
  // isso. Desativar é o caminho — some da lista de escolha e mantém quem já
  // está nele.
  const { data: emUso } = await db
    .from("workspace")
    .select("id")
    .eq("plan_id", id)
    .limit(1);
  if (emUso && emUso.length > 0) {
    return NextResponse.json({ error: "plan_in_use" }, { status: 409 });
  }

  const { error } = await db.from("billing_plan").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
