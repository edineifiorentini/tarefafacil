import { NextResponse } from "next/server";

import type { MotivoDaRetirada } from "@/lib/storage/quota";
import { podeSairDoServidor } from "@/lib/storage/quota";
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
 *  - só olha objetos no formato que o anexo de demanda usa
 *    (`workspace/tarefa/arquivo`, com os dois primeiros níveis em UUID).
 *    Sem esse recorte, qualquer função futura que guardasse arquivo neste
 *    bucket — anexo de chat, logo da organização, contrato assinado —
 *    teria os arquivos apagados no domingo seguinte, em silêncio, porque
 *    não estariam em `attachment`. Quem adicionar outro tipo de arquivo
 *    aqui precisa ensinar esta rota a reconhecê-lo — foi o que a rodada do
 *    anexo de chat fez, adicionando o ramo `<workspace>/chat/<canal>`.
 */

export const dynamic = "force-dynamic";

const BUCKET = "attachments";
/** Idade mínima para um objeto sem dono ser considerado lixo. */
const GRACE_DAYS = 1;
/** Teto por execução: falha parcial é melhor que timeout no meio. */
const MAX_POR_EXECUCAO = 500;
/** Os dois primeiros níveis do caminho de um anexo de demanda são UUIDs. */
/** Segundo nível que marca arquivo de mensagem, não de demanda. */
const PASTA_CHAT = "chat";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Teto da retirada por prazo. Mesma razão do teto da varredura de órfãos. */
const MAX_RETIRADAS = 200;

/**
 * Tira do servidor o material de aprovação que já cumpriu o prazo (0086).
 *
 * **É a operação INVERSA da varredura de órfãos, e por isso mora numa
 * função própria.** A de cima apaga o que NÃO está referenciado; esta apaga
 * o que ESTÁ — arquivo vivo, de demanda real. Misturar as duas num laço só
 * seria o caminho mais curto para um dia apagar a coisa errada.
 *
 * As travas estão em `podeSairDoServidor`, e as três que mais importam:
 * link do Drive nunca sai, anexo interno nunca sai por tempo, e quem já saiu
 * não sai de novo.
 *
 * A linha do anexo NÃO é apagada — só o objeto. É ela que sustenta o
 * histórico e a frase que o cliente lê no lugar do arquivo.
 */
async function retirarVencidos(db: ReturnType<typeof createAdminClient>) {
  const { data: candidatos, error } = await db
    .from("attachment")
    .select("id, task_id, storage_key, entregavel, created_at, purged_at")
    .eq("entregavel", true)
    .not("storage_key", "is", null)
    .is("purged_at", null)
    .limit(2000);

  if (error) return { erro: error.message };
  if (!candidatos || candidatos.length === 0) {
    return { avaliados: 0, retirados: 0 };
  }

  // A data de aprovação vem da demanda, não do anexo: `record_task_approval`
  // registra o veredito da DEMANDA e não recebe id de anexo. Uma consulta só
  // para todas as tarefas envolvidas — não uma por anexo.
  const tarefas = [...new Set(candidatos.map((c) => c.task_id))];
  const { data: aprovacoes } = await db
    .from("task_approval")
    .select("task_id, created_at")
    .in("task_id", tarefas)
    .eq("decision", "aprovado")
    .order("created_at", { ascending: false });

  // A mais recente por tarefa: reaprovar depois de ajustes reinicia o prazo.
  const aprovadoEm = new Map<string, string>();
  for (const a of aprovacoes ?? []) {
    if (!aprovadoEm.has(a.task_id)) aprovadoEm.set(a.task_id, a.created_at);
  }

  const agora = new Date();
  const sair: { id: string; chave: string; motivo: MotivoDaRetirada }[] = [];

  for (const c of candidatos) {
    if (sair.length >= MAX_RETIRADAS) break;
    const motivo = podeSairDoServidor(
      {
        storageKey: c.storage_key,
        entregavel: c.entregavel,
        criadoEm: c.created_at,
        aprovadoEm: aprovadoEm.get(c.task_id) ?? null,
        jaRetiradoEm: c.purged_at,
      },
      agora
    );
    if (motivo) sair.push({ id: c.id, chave: c.storage_key!, motivo });
  }

  if (sair.length === 0) {
    return { avaliados: candidatos.length, retirados: 0 };
  }

  // O objeto primeiro, a marca depois. Nesta ordem, uma falha no meio deixa
  // arquivo apagado com linha ainda sem marca — a varredura seguinte tenta
  // de novo e a remoção é idempotente. Na ordem inversa, a linha diria
  // "retirado" com o arquivo ainda ocupando espaço, e ninguém voltaria lá.
  const rm = await db.storage.from(BUCKET).remove(sair.map((s) => s.chave));
  if (rm.error) return { erro: rm.error.message, tentados: sair.length };

  const carimbo = agora.toISOString();
  for (const s of sair) {
    await db
      .from("attachment")
      .update({ purged_at: carimbo, purge_reason: s.motivo })
      .eq("id", s.id);
  }

  return {
    avaliados: candidatos.length,
    retirados: sair.length,
    porAprovacao: sair.filter((s) => s.motivo === "aprovado_30d").length,
    semDecisao: sair.filter((s) => s.motivo === "sem_decisao_45d").length,
  };
}

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

  // Duas origens de arquivo no mesmo bucket: anexo de demanda e anexo de
  // mensagem. As duas listas entram no MESMO conjunto — um objeto está vivo
  // se qualquer uma delas o referencia.
  const [anexos, mensagens] = await Promise.all([
    db.from("attachment").select("storage_key").not("storage_key", "is", null),
    db
      .from("chat_message")
      .select("storage_key")
      .not("storage_key", "is", null),
  ]);
  if (anexos.error || mensagens.error) {
    return NextResponse.json(
      { erro: (anexos.error ?? mensagens.error)?.message },
      { status: 500 }
    );
  }
  const referenciados = new Set([
    ...(anexos.data ?? []).map((a) => a.storage_key as string),
    ...(mensagens.data ?? []).map((m) => m.storage_key as string),
  ]);

  // O bucket é organizado em workspace/task/arquivo, então a varredura
  // desce dois níveis.
  const orfaos: string[] = [];
  let inspecionados = 0;

  const { data: workspaces } = await db.storage.from(BUCKET).list("", {
    limit: 1000,
  });

  let ignorados = 0;

  for (const ws of workspaces ?? []) {
    // Pasta fora do formato não é anexo de demanda: não é problema desta
    // rota, e apagá-la seria destruir dado de outra função.
    if (!UUID.test(ws.name)) {
      ignorados += 1;
      continue;
    }

    const { data: tarefas } = await db.storage.from(BUCKET).list(ws.name, {
      limit: 1000,
    });

    for (const tarefa of tarefas ?? []) {
      // `<workspace>/chat/<canal>/arquivo`: um nível a mais que o anexo de
      // demanda, então precisa de uma descida própria.
      if (tarefa.name === PASTA_CHAT) {
        const { data: canais } = await db.storage
          .from(BUCKET)
          .list(`${ws.name}/${PASTA_CHAT}`, { limit: 1000 });

        for (const canal of canais ?? []) {
          const prefixoChat = `${ws.name}/${PASTA_CHAT}/${canal.name}`;
          const { data: arquivosChat } = await db.storage
            .from(BUCKET)
            .list(prefixoChat, { limit: 1000 });

          for (const arquivo of arquivosChat ?? []) {
            inspecionados += 1;
            const chave = `${prefixoChat}/${arquivo.name}`;
            if (referenciados.has(chave)) continue;
            const criadoEm = arquivo.created_at
              ? new Date(arquivo.created_at).getTime()
              : 0;
            if (criadoEm > limite) continue;
            if (orfaos.length < MAX_POR_EXECUCAO) orfaos.push(chave);
          }
        }
        continue;
      }

      if (!UUID.test(tarefa.name)) {
        ignorados += 1;
        continue;
      }
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

  // Retenção por prazo (0086). Roda DEPOIS da varredura de órfãos: o que
  // ela retira vira objeto sem dono, e a semana seguinte já o encontra
  // limpo — nesta, a linha ainda o referencia.
  const retencao = await retirarVencidos(db);

  // A resposta é o registro da execução: sem isso, um cron que roda errado
  // por meses passa despercebido.
  return NextResponse.json({
    inspecionados,
    referenciados: referenciados.size,
    removidos: orfaos.length,
    retencao,
    // Pastas fora do formato de anexo de demanda. Se este número crescer,
    // alguém guardou outro tipo de arquivo no bucket e esta rota precisa
    // aprender a reconhecê-lo.
    ignorados,
    executadoEm: new Date().toISOString(),
  });
}
