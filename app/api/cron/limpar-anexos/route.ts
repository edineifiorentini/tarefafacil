import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Recolhe arquivos órfãos do storage.
 *
 * Apagar um anexo pela interface já remove o objeto junto. Esta varredura
 * existe para o caso que a interface não alcança: apagar uma DEMANDA leva as
 * linhas de anexo por cascade, e nesse momento ninguém mais sabe quais
 * chaves de storage pertenciam a ela. Sem a varredura, esses arquivos ficam
 * para sempre — custo e, principalmente, documento que o dono acha que
 * apagou continuando guardado.
 *
 * Duas travas contra apagar o que não deve:
 *
 *  - só remove objeto com mais de GRACE_DAYS. Upload recente pode estar no
 *    intervalo entre o arquivo subir e a linha ser gravada; sem a carência,
 *    a varredura apagaria anexo legítimo em uso.
 *  - só remove o que NÃO está referenciado em `attachment`. A lista de
 *    chaves vivas é lida inteira antes de qualquer remoção.
 */

export const dynamic = "force-dynamic";

const BUCKET = "attachments";
/** Idade mínima para um objeto sem dono ser considerado lixo. */
const GRACE_DAYS = 1;
/** Teto por execução: falha parcial é melhor que timeout no meio. */
const MAX_POR_EXECUCAO = 500;

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  // Sem segredo configurado a rota fica fechada, não aberta. Um cron que
  // não roda é visível; uma rota de exclusão aberta, não.
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const db = createAdminClient();
  const limite = Date.now() - GRACE_DAYS * 86_400_000;

  const { data: vivos, error: erroVivos } = await db
    .from("attachment")
    .select("storage_key")
    .not("storage_key", "is", null);
  if (erroVivos) {
    return NextResponse.json({ erro: erroVivos.message }, { status: 500 });
  }
  const referenciados = new Set(
    (vivos ?? []).map((a) => a.storage_key as string)
  );

  // O bucket é organizado em workspace/task/arquivo, então a varredura
  // desce dois níveis.
  const orfaos: string[] = [];
  let inspecionados = 0;

  const { data: workspaces } = await db.storage.from(BUCKET).list("", {
    limit: 1000,
  });

  for (const ws of workspaces ?? []) {
    const { data: tarefas } = await db.storage.from(BUCKET).list(ws.name, {
      limit: 1000,
    });

    for (const tarefa of tarefas ?? []) {
      const prefixo = `${ws.name}/${tarefa.name}`;
      const { data: arquivos } = await db.storage
        .from(BUCKET)
        .list(prefixo, { limit: 1000 });

      for (const arquivo of arquivos ?? []) {
        inspecionados += 1;
        const chave = `${prefixo}/${arquivo.name}`;
        if (referenciados.has(chave)) continue;

        const criadoEm = arquivo.created_at
          ? new Date(arquivo.created_at).getTime()
          : 0;
        if (criadoEm > limite) continue;

        if (orfaos.length < MAX_POR_EXECUCAO) orfaos.push(chave);
      }
    }
  }

  if (orfaos.length > 0) {
    const { error } = await db.storage.from(BUCKET).remove(orfaos);
    if (error) {
      return NextResponse.json(
        { erro: error.message, inspecionados, encontrados: orfaos.length },
        { status: 500 }
      );
    }
  }

  // A resposta é o registro da execução: sem isso, um cron que roda errado
  // por meses passa despercebido.
  return NextResponse.json({
    inspecionados,
    referenciados: referenciados.size,
    removidos: orfaos.length,
    executadoEm: new Date().toISOString(),
  });
}
