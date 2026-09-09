"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EstadoDaCobranca } from "@/lib/billing/cobranca-do-cliente";
// `import type` é apagado na compilação, então o `server-only` do módulo de
// origem não chega ao navegador — o tipo viaja, o código não.
import type { PainelDeCobranca } from "@/lib/billing/painel";
import type { LeituraDaAssinatura } from "@/lib/billing/situacao";

/**
 * O estado do pagamento, consultado sozinho enquanto houver o que esperar.
 *
 * **A consulta bate no NOSSO servidor, nunca no provedor**, e o que ela lê é
 * o estado já gravado no banco. Isso é o que torna o intervalo curto
 * aceitável: uma tela aberta custa uma leitura barata, não uma ida
 * autenticada à EFI a cada nove segundos.
 *
 * Quem fala com o provedor é a conciliação (`/conferir`), e ela roda no
 * clique do botão — com trava de frequência no próprio banco.
 *
 * **Isto reverte uma decisão anterior, e a reversão é do dono.** A tela
 * nasceu SEM consulta automática de propósito: "Pix cai em segundos, mas
 * quem acabou de pagar volta e recarrega; uma consulta a cada dois segundos
 * gastaria banco e provedor por uma pressa que a pessoa não tem". O pedido
 * de 9/set/2026 foi o contrário, e com o webhook funcionando desde o dia
 * anterior o custo é só a leitura — o provedor não é acordado à toa.
 *
 * O que o TanStack Query já resolve, e por isso não está escrito à mão
 * aqui: `refetchIntervalInBackground` é falso por padrão, então a aba
 * oculta para de consultar sozinha; `refetchOnWindowFocus` faz a consulta
 * imediata ao voltar; o `signal` cancela a requisição em voo quando o
 * componente sai; e `retry` com espera crescente é o backoff.
 */

/**
 * Exportada porque gerar e renovar cobrança escrevem no MESMO cache.
 *
 * Duas chaves para o mesmo dado seria a tela mostrando um estado e a
 * consulta automática outro, alternando a cada nove segundos.
 */
export const CHAVE_DA_COBRANCA = ["cobranca-atual"] as const;

const CHAVE = CHAVE_DA_COBRANCA;

/** Nove segundos: dentro da faixa pedida, e ímpar para não sincronizar com relógio de segundo cheio. */
export const INTERVALO_DE_CONSULTA_MS = 9_000;

/** Estados em que nada mais muda sozinho — perguntar de novo é desperdício. */
function terminou(painel: PainelDeCobranca | undefined): boolean {
  if (!painel) return false;
  const e = painel.cobranca.estado;
  if (e === "paga" || e === "manual") return true;
  // "sem_cobranca" só muda por ação de alguém (gerar ou renovar), nunca
  // sozinho. Continuar consultando aqui seria bater no banco para sempre.
  return e === "sem_cobranca";
}

export type PaymentStatus = {
  estado: EstadoDaCobranca | undefined;
  /**
   * A situação da ASSINATURA — outro objeto, e é por isso que ela vem
   * separada. Empresa ativa com fatura em aberto é o estado normal de todo
   * dia 1º; a tela antiga tratava as duas como a mesma coisa.
   */
  assinatura: LeituraDaAssinatura | undefined;
  /** Data civil da próxima cobrança. Nula quando não haverá nenhuma. */
  proximaRenovacao: string | null | undefined;
  carregando: boolean;
  /** Segundos até a próxima consulta. `null` quando não há consulta em curso. */
  proximaEm: number | null;
  /** A consulta automática está ligada agora? */
  acompanhando: boolean;
  /** "Verificar agora": pede ao servidor que confira com o provedor. */
  conferir: () => void;
  conferindo: boolean;
  erroAoConferir: string | null;
};

export function usePaymentStatus(): PaymentStatus {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: CHAVE,
    queryFn: async ({ signal }): Promise<PainelDeCobranca> => {
      const res = await fetch("/api/billing/cobranca", { signal });
      if (!res.ok) throw new Error("falha");
      return (await res.json()) as PainelDeCobranca;
    },
    // A função recebe a consulta e decide a cada rodada: assim que o estado
    // vira terminal, o `false` desliga o laço sem ninguém precisar limpar
    // timer nenhum.
    refetchInterval: (q) =>
      terminou(q.state.data) ? false : INTERVALO_DE_CONSULTA_MS,
    retry: 3,
    // Espera crescente com teto: rede instável não vira tempestade de
    // requisições, e trinta segundos é o bastante para um deploy passar.
    retryDelay: (tentativa) => Math.min(1000 * 2 ** tentativa, 30_000),
  });

  const acompanhando = !terminou(query.data) && query.data !== undefined;
  const proximaEm = useContagem(
    acompanhando ? query.dataUpdatedAt : null,
    INTERVALO_DE_CONSULTA_MS
  );

  const conferir = useMutation({
    mutationFn: async (): Promise<PainelDeCobranca> => {
      const res = await fetch("/api/billing/cobranca/conferir", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(
          "Não foi possível verificar agora. Tentaremos de novo automaticamente."
        );
      }
      return (await res.json()) as PainelDeCobranca;
    },
    // O servidor devolve o estado REAL confirmado pelo provedor. O navegador
    // só o exibe — em momento nenhum ele decide que algo foi pago.
    onSuccess: (novo) => qc.setQueryData(CHAVE, novo),
  });

  return {
    estado: query.data?.cobranca,
    assinatura: query.data?.assinatura,
    proximaRenovacao: query.data?.proximaRenovacao,
    carregando: query.isPending,
    proximaEm,
    acompanhando,
    conferir: () => conferir.mutate(),
    conferindo: conferir.isPending,
    erroAoConferir: conferir.error?.message ?? null,
  };
}

/**
 * Segundos que faltam para a próxima consulta.
 *
 * Sincronizado com `dataUpdatedAt`, que é quando a resposta chegou de fato —
 * um contador com relógio próprio descola do laço em poucos minutos e passa
 * a mostrar "00:00" enquanto nada acontece.
 *
 * `desde = null` desliga o intervalo. É o que faz o contador sumir junto com
 * a consulta quando o pagamento é confirmado.
 */
function useContagem(desde: number | null, janelaMs: number): number | null {
  const [agora, setAgora] = useState(() => Date.now());

  // O intervalo é o ÚNICO escritor. Chamar `setAgora` na entrada do efeito
  // deixaria o contador exato no instante da resposta, e custaria um render
  // a mais por rodada — além de ser escrita de estado dentro de efeito, que
  // o React 19 desencoraja. O desalinhamento resultante é de menos de um
  // segundo, e o teto abaixo o absorve.
  useEffect(() => {
    if (desde === null) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [desde]);

  if (desde === null) return null;

  const restante = Math.ceil((desde + janelaMs - agora) / 1000);
  // Trava nas duas pontas: `agora` pode estar até um segundo atrasado logo
  // depois de uma resposta chegar, e sem o teto o contador mostraria por um
  // instante mais tempo do que a janela inteira.
  return Math.min(Math.ceil(janelaMs / 1000), Math.max(0, restante));
}
