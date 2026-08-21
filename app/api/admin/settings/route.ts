import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ajustes da plataforma inteira. Uma linha só na tabela (0061).
 *
 * Roda com a chave secreta porque `platform_setting` não tem policy
 * nenhuma: quem decide se a porta está aberta não pode ser quem está
 * tentando entrar.
 */

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("platform_setting")
    .select("signups_enabled, updated_at")
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Sem linha, o padrão é aberto — é o mesmo que o trigger assume.
  return NextResponse.json({
    signups_enabled: data?.signups_enabled ?? true,
    updated_at: data?.updated_at ?? null,
  });
}

export async function PATCH(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { signups_enabled?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.signups_enabled !== "boolean") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db
    .from("platform_setting")
    .update({ signups_enabled: body.signups_enabled })
    .eq("id", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, signups_enabled: body.signups_enabled });
}
