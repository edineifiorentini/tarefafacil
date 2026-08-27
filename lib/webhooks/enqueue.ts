// Coloca um evento na fila de saída. Só servidor.
//
// AS DUAS REGRAS DO DONO MORAM AQUI, e não na tela, porque evento que sai
// errado já saiu — não há como recolher da caixa de entrada de um sistema
// alheio:
//
// 1. **Subtarefa não gera evento** (regra 9 do CLAUDE.md). Quem chama nunca
//    passa subtarefa; a assinatura só aceita demanda, projeto e comentário,
//    e é o compilador que impede o engano.
//
// 2. **O eco sai para os outros, não para quem causou.** Se a mudança veio
//    de uma chave de API, a inscrição daquela chave é pulada. Por isso a
//    origem é gravada na linha da entrega: recuperar depois é impossível.

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

import { VERSAO_DO_CORPO, type CorpoDoEvento, type Evento } from "./events";

export type PedidoDeEvento = {
  workspaceId: string;
  evento: Evento;
  /** Dados do fato. Nunca leva segredo nem dado que a empresa não veria. */
  dados: Record<string, unknown>;
  /**
   * Chave de API que causou a mudança, quando veio de integração.
   * `null` para ação de gente pela interface.
   */
  origemKeyId?: string | null;
  /** Quando o fato aconteceu. Padrão: agora. */
  ocorridoEm?: string;
};

export type ResultadoDoEnfileiramento = {
  /** Quantas inscrições receberão este evento. */
  enfileiradas: number;
  /** Quantas foram puladas por serem a origem da mudança. */
  puladasPorOrigem: number;
};

/**
 * Enfileira um evento para todas as inscrições interessadas.
 *
 * Não envia nada: quem envia é o cron. Enfileirar é rápido e não pode
 * atrasar a resposta de quem mexeu na demanda — nem falhar por causa de um
 * destino fora do ar.
 *
 * Erro aqui NÃO derruba quem chamou. Perder um evento é ruim; impedir a
 * pessoa de concluir uma demanda porque um webhook não pôde ser enfileirado
 * é pior.
 */
export async function enfileirarEvento(
  pedido: PedidoDeEvento
): Promise<ResultadoDoEnfileiramento> {
  const vazio = { enfileiradas: 0, puladasPorOrigem: 0 };

  try {
    const db = createAdminClient();

    const { data: inscricoes } = await db
      .from("webhook_endpoint")
      .select("id, eventos, api_key_id")
      .eq("workspace_id", pedido.workspaceId)
      .eq("ativo", true);

    type E = { id: string; eventos: string[]; api_key_id: string | null };
    const interessadas = ((inscricoes ?? []) as E[]).filter((e) =>
      e.eventos.includes(pedido.evento)
    );

    if (interessadas.length === 0) return vazio;

    const { data: empresa } = await db
      .from("workspace")
      .select("id, name")
      .eq("id", pedido.workspaceId)
      .maybeSingle();

    if (!empresa) return vazio;

    // O eco não volta para quem causou: a inscrição que declara pertencer à
    // chave de origem é pulada. Sai da lista já carregada, sem outra consulta
    // — e o caminho comum (ação de gente, sem origem) não filtra nada.
    const alvos = pedido.origemKeyId
      ? interessadas.filter((e) => e.api_key_id !== pedido.origemKeyId)
      : interessadas;
    const ocorridoEm = pedido.ocorridoEm ?? new Date().toISOString();

    const linhas = alvos.map((e) => {
      const corpo: CorpoDoEvento = {
        versao: VERSAO_DO_CORPO,
        evento: pedido.evento,
        ocorridoEm,
        // Um id por ENTREGA, não por evento: o destino usa isto para ser
        // idempotente, e duas inscrições recebendo o mesmo id atrapalhariam
        // quem guarda "já processei este".
        entregaId: randomUUID(),
        empresa: { id: empresa.id, nome: empresa.name },
        dados: pedido.dados,
      };

      return {
        endpoint_id: e.id,
        workspace_id: pedido.workspaceId,
        evento: pedido.evento,
        corpo: corpo as unknown as Json,
        origem_key_id: pedido.origemKeyId ?? null,
      };
    });

    if (linhas.length === 0) {
      return { enfileiradas: 0, puladasPorOrigem: interessadas.length };
    }

    const { error } = await db.from("webhook_delivery").insert(linhas);
    if (error) {
      console.error("[webhook] falha ao enfileirar", error);
      return vazio;
    }

    return {
      enfileiradas: linhas.length,
      puladasPorOrigem: interessadas.length - linhas.length,
    };
  } catch (e) {
    console.error("[webhook] falha ao enfileirar", e);
    return vazio;
  }
}
