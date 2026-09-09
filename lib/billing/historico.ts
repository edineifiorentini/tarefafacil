import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  rotuloDaCobranca,
  situacaoDaCobranca,
  tomDaCobranca,
  type SituacaoDaCobranca,
  type Tom,
} from "./situacao";

/**
 * As cobranças anteriores desta empresa.
 *
 * **Não existia.** `subscription_charge` era lida só pelo painel da
 * plataforma; quem paga não tinha como conferir o que já pagou, nem quando.
 * Para um SaaS isso é básico — a primeira pergunta de quem contesta uma
 * cobrança é "me mostra o histórico".
 *
 * SOBRE RECIBO: não há, e a ausência é medida. A EFI não devolve
 * comprovante nenhum (9/set/2026: `/v2/cob/{txid}` traz status, valor e
 * horário, e nada parecido com um documento). Quem precisa de comprovante
 * pega no próprio banco, onde o Pix aparece no extrato. Uma coluna "recibo"
 * vazia em toda linha seria pior que não ter a coluna.
 *
 * SOBRE QUEM VÊ: a mesma regra da cobrança corrente — qualquer membro. A
 * 0049 diz que "nem admin do workspace vê valor" e a RLS de
 * `subscription_charge` só responde ao dono, mas a rota da cobrança já
 * entrega valor a qualquer membro desde que existe. Ter duas réguas para o
 * mesmo dado na mesma tela seria pior que ter uma régua discutível: ou as
 * duas apertam, ou nenhuma. Fica anotado para quando o dono decidir.
 */

export type LinhaDoHistorico = {
  id: string;
  /** O ciclo que a cobrança paga. É a "competência". */
  periodo: { inicio: string; fim: string };
  planoNome: string;
  valorCents: number;
  /** Quanto entrou de fato. `null` enquanto não houver pagamento. */
  pagoCents: number | null;
  pagoEm: string | null;
  situacao: SituacaoDaCobranca;
  rotulo: string;
  tom: Tom;
  /** "Pix" ou "Combinado por fora", conforme o provedor gravado. */
  formaDePagamento: string;
};

export type Historico = {
  linhas: LinhaDoHistorico[];
  /**
   * `period_start` da última linha, para pedir a página seguinte.
   *
   * `null` quando acabou. Cursor e não deslocamento: com `offset`, uma
   * cobrança emitida entre uma página e outra empurraria a lista e
   * repetiria uma linha.
   */
  proximoCursor: string | null;
};

/** Poucas por vez: um ano de assinatura mensal cabe em uma página. */
export const POR_PAGINA = 12;

export async function historicoDeCobrancas(
  workspaceId: string,
  opcoes: { cursor?: string | null; agora?: Date } = {}
): Promise<Historico> {
  const db = createAdminClient();
  const agora = opcoes.agora ?? new Date();

  let consulta = db
    .from("subscription_charge")
    .select(
      "id, period_start, period_end, plan_name, amount_cents, paid_amount_cents, paid_at, status, provider, expires_at, copia_e_cola"
    )
    .eq("workspace_id", workspaceId)
    .order("period_start", { ascending: false })
    // Uma a mais do que cabe na página: é assim que se sabe que existe
    // próxima sem fazer uma segunda consulta de contagem.
    .limit(POR_PAGINA + 1);

  if (opcoes.cursor) consulta = consulta.lt("period_start", opcoes.cursor);

  const { data } = await consulta;
  const todas = data ?? [];
  const temMais = todas.length > POR_PAGINA;
  const pagina = temMais ? todas.slice(0, POR_PAGINA) : todas;

  return {
    linhas: pagina.map((c) => {
      const situacao = situacaoDaCobranca({
        status: c.status,
        expiraEm: c.expires_at,
        temCodigo: Boolean(c.copia_e_cola),
        agora,
      });

      return {
        id: c.id,
        periodo: { inicio: c.period_start, fim: c.period_end },
        planoNome: c.plan_name,
        valorCents: c.amount_cents,
        pagoCents: c.paid_amount_cents,
        pagoEm: c.paid_at,
        situacao,
        rotulo: rotuloDaCobranca(situacao),
        tom: tomDaCobranca(situacao),
        formaDePagamento: formaDePagamento(c.provider),
      };
    }),
    proximoCursor: temMais
      ? (pagina[pagina.length - 1]?.period_start ?? null)
      : null,
  };
}

/**
 * O provedor, dito para quem paga.
 *
 * A coluna guarda `efi:producao`, `efi:homologacao` ou `manual` — nomes de
 * integração, que não dizem nada a quem lê. E o ambiente NUNCA aparece: para
 * o cliente, Pix é Pix.
 */
function formaDePagamento(provider: string): string {
  if (provider === "manual") return "Combinado por fora";
  return "Pix";
}
