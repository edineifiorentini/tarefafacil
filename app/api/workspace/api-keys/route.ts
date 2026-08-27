import { NextResponse } from "next/server";

import { criarChave, listarChaves, podeGerenciar } from "@/lib/api-keys/store";
import { createClient } from "@/lib/supabase/server";

/**
 * Chaves de API da empresa.
 *
 * A tabela tem RLS ligada e nenhuma política, então nada disto passa pelo
 * cliente: quem lê é esta rota, com a chave secreta, e ela devolve nome,
 * prefixo e datas. O hash não sai daqui em nenhuma resposta.
 *
 * O valor completo aparece UMA vez, na resposta do POST. Não há rota que o
 * recupere depois, porque ele não existe em lugar nenhum — é o ponto de
 * guardar só o hash.
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

  // Mesma permissão da criação: quem não pode criar também não precisa ver a
  // lista de quais existem e quando foram usadas.
  if (!(await podeGerenciar(ctx.workspaceId, ctx.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ chaves: await listarChaves(ctx.workspaceId) });
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
        message: "Só quem é dono da empresa pode criar chave de API",
      },
      { status: 403 }
    );
  }

  let corpo: { nome?: string };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const resultado = await criarChave({
    workspaceId: ctx.workspaceId,
    nome: corpo.nome ?? "",
    criadaPor: ctx.userId,
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
    prefixo: resultado.prefixo,
    // Única vez que este valor existe fora da memória do servidor.
    valor: resultado.valor,
  });
}
