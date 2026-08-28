import { NextResponse } from "next/server";

import {
  criarInscricao,
  listarEntregas,
  listarInscricoes,
  podeGerenciar,
} from "@/lib/webhooks/endpoints";
import { createClient } from "@/lib/supabase/server";

/**
 * Destinos de webhook da empresa.
 *
 * As tabelas têm RLS ligada e nenhuma política, então nada disto passa pelo
 * cliente. O segredo cifrado não sai daqui em resposta nenhuma — o valor em
 * claro aparece uma vez, na criação, e depois só existe no destino.
 */

async function contexto(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const workspaceId = new URL(request.url).searchParams.get("workspace");
  if (!workspaceId) return null;

  return { userId: user.id, workspaceId };
}

export async function GET(request: Request) {
  const ctx = await contexto(request);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await podeGerenciar(ctx.workspaceId, ctx.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // As duas coisas juntas: quem abre a tela quer ver os destinos E se as
  // entregas estão chegando. Duas requisições para montar um cartão só é
  // trabalho sem ganho.
  const [inscricoes, entregas] = await Promise.all([
    listarInscricoes(ctx.workspaceId),
    listarEntregas(ctx.workspaceId),
  ]);

  return NextResponse.json({ inscricoes, entregas });
}

export async function POST(request: Request) {
  const ctx = await contexto(request);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await podeGerenciar(ctx.workspaceId, ctx.userId))) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Só quem é dono da empresa pode cadastrar destino",
      },
      { status: 403 }
    );
  }

  let corpo: { url?: string; eventos?: string[]; apiKeyId?: string | null };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const resultado = await criarInscricao({
    workspaceId: ctx.workspaceId,
    url: corpo.url ?? "",
    eventos: Array.isArray(corpo.eventos) ? corpo.eventos : [],
    apiKeyId: corpo.apiKeyId ?? null,
    criadoPor: ctx.userId,
  });

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.erro, message: resultado.mensagem },
      { status: resultado.erro === "falhou" ? 500 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: resultado.id,
    // Única vez que este valor sai do servidor.
    segredo: resultado.segredo,
  });
}
