import "server-only";

import { FUSO_PADRAO, diaCivilDeEm, diaCivilEm } from "@/lib/dates/day";
import { createAdminClient } from "@/lib/supabase/admin";

import { estadoAtual, type EstadoDaCobranca } from "./cobranca-do-cliente";
import { cycleFor } from "./cycle";
import { situacaoDaAssinatura, type LeituraDaAssinatura } from "./situacao";

/**
 * O que a tela de assinatura precisa saber, numa resposta só.
 *
 * **Assinatura e cobrança viajam juntas mas são separadas**, porque a tela
 * mostrava as duas como se fossem uma: "Ativa" saía de
 * `suspended ? … : teste ? … : "Ativa"` e ignorava acesso vencido.
 *
 * SOBRE O QUE SAI DAQUI: a leitura da assinatura tem situação, rótulo, tom
 * e uma frase — **e nenhum valor**. A 0049 diz que "nem admin do workspace
 * vê valor", e a RLS de `subscription` só responde ao dono. Esta função
 * roda com a chave secreta e poderia devolver tudo; devolve o estado
 * porque saber que a conta está em dia não é a mesma coisa que saber
 * quanto ela custa. Decidido pelo dono em 9/set/2026.
 */
export type PainelDeCobranca = {
  cobranca: EstadoDaCobranca;
  assinatura: LeituraDaAssinatura;
  /**
   * Data civil da próxima cobrança. `null` quando não haverá nenhuma.
   *
   * Sai do servidor porque depende do `billing_day` da assinatura, e a RLS
   * de `subscription` só responde ao dono. É data, não valor — cabe na
   * régua que o dono escolheu em 9/set/2026.
   *
   * `null` para vitalício, cancelada, plano gratuito e para quem ainda não
   * tem assinatura. A tela diz o motivo em vez de inventar uma data.
   */
  proximaRenovacao: string | null;
};

export async function painelDaCobranca(
  workspaceId: string,
  agora = new Date()
): Promise<PainelDeCobranca> {
  const [cobranca, lida] = await Promise.all([
    estadoAtual(workspaceId, agora),
    lerAssinatura(workspaceId, agora),
  ]);
  return { cobranca, ...lida };
}

/**
 * O painel em volta de uma cobrança que JÁ foi apurada.
 *
 * Existe para quem acabou de gerar ou de conferir: essas operações
 * devolvem um estado com mensagem própria — "não foi possível falar com o
 * provedor agora", por exemplo — e reler do banco por cima descartaria
 * justamente a frase que explica o que aconteceu.
 */
export async function painelEmVoltaDe(
  cobranca: EstadoDaCobranca,
  workspaceId: string,
  agora = new Date()
): Promise<PainelDeCobranca> {
  return { cobranca, ...(await lerAssinatura(workspaceId, agora)) };
}

/**
 * A situação da assinatura, montada a partir do banco.
 *
 * **AS DUAS DATAS RECEBEM TRATAMENTOS DIFERENTES, e cada um é o certo:**
 *
 * - `trial_ends_at` é `now() + interval '7 days'` (0060) — instante de
 *   verdade. Ler o dia dele exige o fuso escrito, senão a virada da
 *   meia-noite erra por um na Vercel, que roda em UTC.
 *
 * - `access_expires_at` guarda uma DATA CIVIL. Quem escreve é o
 *   `settle.ts`, com o texto que `accessUntil` devolve — "2026-10-14".
 *   Convertê-la com fuso a jogaria um dia para trás (meia-noite UTC é
 *   21h do dia anterior no Brasil), e cortar o acesso de quem pagou um dia
 *   antes é o pior defeito possível aqui. Por isso a data sai por recorte,
 *   não por conversão.
 *
 * A diferença é sutil e custou dois defeitos neste projeto. Ver regra 15.
 */
async function lerAssinatura(
  workspaceId: string,
  agora: Date
): Promise<{
  assinatura: LeituraDaAssinatura;
  proximaRenovacao: string | null;
}> {
  const db = createAdminClient();

  const [{ data: ws }, { data: assinatura }] = await Promise.all([
    db
      .from("workspace")
      .select("plan_id, suspended, trial, trial_ends_at, access_expires_at")
      .eq("id", workspaceId)
      .maybeSingle(),
    db
      .from("subscription")
      .select("plan_id, status, billing_day")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  // A mesma precedência do resto do módulo: o plano da assinatura vence o do
  // workspace. Duas fontes para a mesma pergunta é como elas divergem.
  const planId = assinatura?.plan_id ?? ws?.plan_id ?? null;

  const { data: plano } = planId
    ? await db
        .from("billing_plan")
        .select("vitalicio, price_cents")
        .eq("id", planId)
        .maybeSingle()
    : { data: null };

  const leitura = situacaoDaAssinatura({
    suspensa: ws?.suspended ?? false,
    emTeste: ws?.trial ?? false,
    testeAte: ws?.trial_ends_at
      ? diaCivilDeEm(ws.trial_ends_at, FUSO_PADRAO)
      : null,
    vitalicio: plano?.vitalicio ?? false,
    cancelada: assinatura?.status === "cancelada",
    acessoAte: ws?.access_expires_at ? ws.access_expires_at.slice(0, 10) : null,
    hoje: diaCivilEm(agora, FUSO_PADRAO),
  });

  // Só existe renovação onde vai haver cobrança. Vitalício, gratuito,
  // cancelada e quem ainda não tem assinatura ficam sem data — e a tela diz
  // o motivo em vez de mostrar um dia que nunca vai chegar.
  const vaiCobrar =
    Boolean(assinatura) &&
    !plano?.vitalicio &&
    (plano?.price_cents ?? 0) > 0 &&
    assinatura?.status !== "cancelada";

  return {
    assinatura: leitura,
    // `cycleFor().end` é o primeiro dia do período seguinte, que é
    // exatamente quando a próxima fatura nasce.
    proximaRenovacao: vaiCobrar
      ? cycleFor(agora, assinatura!.billing_day, FUSO_PADRAO).end
      : null,
  };
}
