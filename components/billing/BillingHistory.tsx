"use client";

import { useState } from "react";

import { IconChevronDown, IconReceipt } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Historico } from "@/lib/billing/historico";
import type { Tom } from "@/lib/billing/situacao";
import { dataDeInstanteBR, dataPuraBR } from "@/lib/utils/fuso";

/**
 * O que já foi cobrado desta empresa.
 *
 * **Fechado por padrão, e só busca quando abre.** A maioria de quem entra
 * nesta tela veio pagar o mês, não auditar o ano — carregar a lista para
 * todo mundo seria uma consulta a mais em toda visita, para um dado que
 * quase ninguém abre.
 *
 * Sem coluna de recibo: a EFI não devolve comprovante, e uma coluna vazia
 * em toda linha seria pior que a ausência dela. Quem precisa pega no
 * próprio banco.
 */
export function BillingHistory() {
  const [aberto, setAberto] = useState(false);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      // Só dispara quando alguém abre — ver o comentário do topo.
      enabled: aberto,
      queryKey: ["historico-de-cobrancas"],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam, signal }): Promise<Historico> => {
        const url = pageParam
          ? `/api/billing/historico?cursor=${encodeURIComponent(pageParam)}`
          : "/api/billing/historico";
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("falha");
        return (await res.json()) as Historico;
      },
      getNextPageParam: (ultima) => ultima.proximoCursor,
    });

  const linhas = data?.pages.flatMap((p) => p.linhas) ?? [];

  return (
    <section className="border-line bg-card rounded-md border">
      <h3>
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)]"
        >
          <IconReceipt
            size={18}
            stroke={1.75}
            aria-hidden
            className="text-fg-muted shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="text-fg block text-[length:var(--text-small-size)] font-medium">
              Histórico de cobranças
            </span>
            <span className="text-fg-secondary block text-[length:var(--text-caption-size)]">
              Consulte os pagamentos anteriores
            </span>
          </span>
          <IconChevronDown
            size={18}
            stroke={1.75}
            aria-hidden
            className={`text-fg-muted shrink-0 transition-transform [transition-duration:var(--dur-fast)] ${
              aberto ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>

      {aberto ? (
        <div className="border-line border-t px-4 py-3">
          {isPending ? (
            <Skeleton variant="block" className="h-20" />
          ) : linhas.length === 0 ? (
            <p className="text-fg-secondary text-[length:var(--text-small-size)]">
              Nenhuma cobrança até agora.
            </p>
          ) : (
            <>
              <ul className="flex flex-col">
                {linhas.map((l) => (
                  <li
                    key={l.id}
                    className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-fg text-[length:var(--text-small-size)] font-medium">
                        {dataPuraBR(l.periodo.inicio)} a{" "}
                        {dataPuraBR(l.periodo.fim)}
                      </p>
                      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                        {l.planoNome} · {l.formaDePagamento}
                        {l.pagoEm
                          ? ` · pago em ${dataDeInstanteBR(l.pagoEm)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-fg text-[length:var(--text-small-size)] font-medium">
                        {/* O que ENTROU quando houve pagamento; o cobrado
                            enquanto não houve. Mostrar sempre o cobrado
                            esconderia um pagamento parcial. */}
                        {reais(l.pagoCents ?? l.valorCents)}
                      </span>
                      <Badge variant={variante(l.tom)}>{l.rotulo}</Badge>
                    </div>
                  </li>
                ))}
              </ul>

              {hasNextPage ? (
                <div className="pt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    Carregar mais
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** O tom semântico do domínio, traduzido para a variante do componente. */
function variante(tom: Tom): "neutral" | "positive" | "due-soon" | "overdue" {
  if (tom === "positivo") return "positive";
  if (tom === "atencao") return "due-soon";
  if (tom === "critico") return "overdue";
  return "neutral";
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
