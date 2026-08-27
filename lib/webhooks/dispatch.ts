// Envia as entregas pendentes. Só servidor, chamado pelo cron.
//
// O QUE ESTE ARQUIVO PROTEGE, além de entregar:
//
// - **SSRF a cada salto.** A URL foi conferida no cadastro, mas DNS muda e
//   um destino legítimo pode responder 302 para dentro. Por isso a
//   verificação roda de novo em cada redirecionamento, e os redirecionamentos
//   são seguidos à mão — `fetch` com `redirect: "follow"` seguiria sem
//   perguntar nada.
// - **O segredo.** Ele sai do banco cifrado e só existe em memória durante a
//   assinatura. Nunca entra em log, nem no registro de erro.
// - **A fila.** Falha não perde o evento: volta com espera crescente até
//   desistir, e a desistência fica registrada.

import { createHmac } from "node:crypto";

import { decryptSecret } from "@/lib/crypto/secretBox";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  CABECALHO_ASSINATURA,
  CABECALHO_ENTREGA,
  CABECALHO_TIMESTAMP,
  type CorpoDoEvento,
} from "./events";
import { MAXIMO_DE_REDIRECIONAMENTOS, verificarDestino } from "./ssrf";

/** Depois disto a entrega é dada como perdida. */
export const MAXIMO_DE_TENTATIVAS = 6;

/** Falhas seguidas de um destino antes de ele ser desligado. */
export const FALHAS_ATE_DESATIVAR = 20;

/** Quanto tempo esperar a resposta do destino. */
const TIMEOUT_MS = 10_000;

/** Quantas entregas por execução do cron. */
const LOTE = 50;

/** Recorte da resposta guardado no erro. Corpo inteiro pode ser uma página. */
const LIMITE_DO_ERRO = 500;

/**
 * Espera antes da próxima tentativa, em minutos.
 *
 * Crescente: 1, 5, 15, 60, 180, 360. Um destino que caiu volta em minutos ou
 * em horas, e insistir de segundo em segundo só transforma a queda dele em
 * carga nossa.
 */
const ESPERAS_MIN = [1, 5, 15, 60, 180, 360];

function proximaEspera(tentativas: number): number {
  return ESPERAS_MIN[Math.min(tentativas, ESPERAS_MIN.length - 1)];
}

export type ResumoDoEnvio = {
  processadas: number;
  entregues: number;
  reagendadas: number;
  desistidas: number;
  destinosDesativados: number;
};

/**
 * Assina o corpo.
 *
 * O carimbo de tempo entra NA ASSINATURA, não só no cabeçalho: assinar só o
 * corpo deixaria quem capturasse uma entrega reenviá-la para sempre, com o
 * carimbo trocado, e a conta bateria.
 */
export function assinar(
  segredo: string,
  timestamp: string,
  corpo: string
): string {
  return createHmac("sha256", segredo)
    .update(`${timestamp}.${corpo}`)
    .digest("hex");
}

/**
 * Entrega uma requisição seguindo redirecionamento à mão, conferindo o
 * destino a cada salto.
 */
async function entregar(
  url: string,
  corpo: string,
  cabecalhos: Record<string, string>
): Promise<{ status: number; texto: string } | { erro: string }> {
  let alvo = url;

  for (let salto = 0; salto <= MAXIMO_DE_REDIRECIONAMENTOS; salto++) {
    const check = await verificarDestino(alvo);
    if (!check.ok) return { erro: check.motivo };

    let resposta: Response;
    try {
      resposta = await fetch(alvo, {
        method: "POST",
        headers: { "content-type": "application/json", ...cabecalhos },
        body: corpo,
        // À mão, de propósito: seguir sozinho pularia a checagem acima.
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      return {
        erro: e instanceof Error ? e.message : "falha de rede",
      };
    }

    if (resposta.status >= 300 && resposta.status < 400) {
      const proximo = resposta.headers.get("location");
      if (!proximo) return { status: resposta.status, texto: "" };
      alvo = new URL(proximo, alvo).toString();
      continue;
    }

    const texto = (await resposta.text().catch(() => "")).slice(
      0,
      LIMITE_DO_ERRO
    );
    return { status: resposta.status, texto };
  }

  return { erro: "redirecionamentos demais" };
}

export async function enviarPendentes(
  agora = new Date()
): Promise<ResumoDoEnvio> {
  const db = createAdminClient();
  const resumo: ResumoDoEnvio = {
    processadas: 0,
    entregues: 0,
    reagendadas: 0,
    desistidas: 0,
    destinosDesativados: 0,
  };

  const { data: fila } = await db
    .from("webhook_delivery")
    .select("id, endpoint_id, evento, corpo, tentativas")
    .eq("status", "pendente")
    .lte("proxima_tentativa", agora.toISOString())
    .order("proxima_tentativa", { ascending: true })
    .limit(LOTE);

  const pendentes = (fila ?? []) as {
    id: string;
    endpoint_id: string;
    evento: string;
    corpo: CorpoDoEvento;
    tentativas: number;
  }[];

  if (pendentes.length === 0) return resumo;

  // Destinos numa consulta, não uma por entrega: um destino costuma ter
  // várias entregas pendentes no mesmo lote.
  const ids = [...new Set(pendentes.map((p) => p.endpoint_id))];
  const { data: destinos } = await db
    .from("webhook_endpoint")
    .select("id, url, segredo_cifrado, ativo, falhas_seguidas")
    .in("id", ids);

  const porId = new Map(
    (
      (destinos ?? []) as {
        id: string;
        url: string;
        segredo_cifrado: string;
        ativo: boolean;
        falhas_seguidas: number;
      }[]
    ).map((d) => [d.id, d])
  );

  for (const entrega of pendentes) {
    resumo.processadas++;
    const destino = porId.get(entrega.endpoint_id);

    if (!destino || !destino.ativo) {
      await db
        .from("webhook_delivery")
        .update({
          status: "desistiu",
          ultimo_erro: "destino desativado ou removido",
        })
        .eq("id", entrega.id);
      resumo.desistidas++;
      continue;
    }

    const timestamp = String(Math.floor(agora.getTime() / 1000));
    const corpo = JSON.stringify(entrega.corpo);

    let resultado: { status: number; texto: string } | { erro: string };
    try {
      // O segredo em claro existe só nestas duas linhas.
      const segredo = decryptSecret(destino.segredo_cifrado);
      resultado = await entregar(destino.url, corpo, {
        [CABECALHO_ASSINATURA]: assinar(segredo, timestamp, corpo),
        [CABECALHO_TIMESTAMP]: timestamp,
        [CABECALHO_ENTREGA]: entrega.corpo.entregaId,
      });
    } catch {
      // Falha ao decifrar: a chave do ambiente mudou, ou a linha está
      // corrompida. Não adianta tentar de novo.
      await db
        .from("webhook_delivery")
        .update({
          status: "desistiu",
          ultimo_erro: "não foi possível ler o segredo do destino",
        })
        .eq("id", entrega.id);
      resumo.desistidas++;
      continue;
    }

    const sucesso =
      "status" in resultado &&
      resultado.status >= 200 &&
      resultado.status < 300;

    if (sucesso) {
      await db
        .from("webhook_delivery")
        .update({
          status: "entregue",
          entregue_em: agora.toISOString(),
          tentativas: entrega.tentativas + 1,
          ultimo_status_http: (resultado as { status: number }).status,
          ultimo_erro: null,
        })
        .eq("id", entrega.id);

      // Sucesso zera a contagem: um destino que voltou a funcionar não deve
      // carregar a conta das quedas antigas até ser desligado por engano.
      if (destino.falhas_seguidas > 0) {
        await db
          .from("webhook_endpoint")
          .update({ falhas_seguidas: 0 })
          .eq("id", destino.id);
        destino.falhas_seguidas = 0;
      }

      resumo.entregues++;
      continue;
    }

    const tentativas = entrega.tentativas + 1;
    const erro =
      "erro" in resultado
        ? resultado.erro
        : `HTTP ${resultado.status}${resultado.texto ? `: ${resultado.texto}` : ""}`;

    if (tentativas >= MAXIMO_DE_TENTATIVAS) {
      await db
        .from("webhook_delivery")
        .update({
          status: "desistiu",
          tentativas,
          ultimo_status_http: "status" in resultado ? resultado.status : null,
          ultimo_erro: erro,
        })
        .eq("id", entrega.id);
      resumo.desistidas++;
    } else {
      const quando = new Date(
        agora.getTime() + proximaEspera(tentativas) * 60_000
      );
      await db
        .from("webhook_delivery")
        .update({
          tentativas,
          proxima_tentativa: quando.toISOString(),
          ultimo_status_http: "status" in resultado ? resultado.status : null,
          ultimo_erro: erro,
        })
        .eq("id", entrega.id);
      resumo.reagendadas++;
    }

    const falhas = destino.falhas_seguidas + 1;
    destino.falhas_seguidas = falhas;

    if (falhas >= FALHAS_ATE_DESATIVAR) {
      // Destino morto há tempo demais é desligado, e não apagado: o dono
      // precisa ver que existe e por que parou.
      await db
        .from("webhook_endpoint")
        .update({
          ativo: false,
          desativado_em: agora.toISOString(),
          falhas_seguidas: falhas,
        })
        .eq("id", destino.id);
      resumo.destinosDesativados++;
    } else {
      await db
        .from("webhook_endpoint")
        .update({ falhas_seguidas: falhas })
        .eq("id", destino.id);
    }
  }

  return resumo;
}
