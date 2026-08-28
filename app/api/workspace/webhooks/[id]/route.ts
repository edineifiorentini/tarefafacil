import { NextResponse } from "next/server";

import {
  alternarAtivo,
  podeGerenciar,
  removerInscricao,
  rotacionarSegredo,
} from "@/lib/webhooks/endpoints";
import { createClient } from "@/lib/supabase/server";

/**
 * Ações sobre um destino: pausar, reativar, trocar o segredo e remover.
 *
 * Todas conferem a empresa DENTRO da consulta, não só na permissão — o id do
 * destino vem da URL e pode ser de outra empresa.
 */

async function contexto(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const workspaceId = new URL(request.url).searchParams.get("workspace");
  if (!workspaceId) return null;
  if (!(await podeGerenciar(workspaceId, user.id))) return null;

  return { userId: user.id, workspaceId };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await contexto(request);
  if (!ctx) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let corpo: { acao?: string; ativo?: boolean };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (corpo.acao === "rotacionar") {
    const r = await rotacionarSegredo(ctx.workspaceId, id, ctx.userId);
    if (!r.ok) {
      return NextResponse.json(
        { error: r.erro, message: r.mensagem },
        { status: r.erro === "not_found" ? 404 : 400 }
      );
    }
    return NextResponse.json({ ok: true, segredo: r.segredo });
  }

  if (corpo.acao === "ativo" && typeof corpo.ativo === "boolean") {
    const ok = await alternarAtivo(
      ctx.workspaceId,
      id,
      corpo.ativo,
      ctx.userId
    );
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ error: "acao_invalida" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await contexto(request);
  if (!ctx) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await removerInscricao(ctx.workspaceId, id, ctx.userId);

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "not_found" }, { status: 404 });
}
