import { NextResponse } from "next/server";

import { podeGerenciar, revogarChave } from "@/lib/api-keys/store";
import { createClient } from "@/lib/supabase/server";

/**
 * Revoga uma chave.
 *
 * Revogar não apaga a linha: ela fica, com a data, para o histórico poder
 * dizer que a chave existiu e até quando. Apagar deixaria um log cheio de
 * usos de uma chave que "nunca existiu".
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspace");
  if (!workspaceId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!(await podeGerenciar(workspaceId, user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const revogou = await revogarChave(workspaceId, id);

  if (!revogou) {
    // 404 e não 500: ou a chave não é desta empresa, ou já estava revogada.
    // As duas terminam no mesmo lugar — a chave não vale mais.
    return NextResponse.json(
      { error: "not_found", message: "Chave não encontrada ou já revogada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
