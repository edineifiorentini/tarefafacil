"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Distribution } from "@/lib/today/summary";

/**
 * Quem carrega o quê, dentro do filtro que está aberto ao lado.
 *
 * **Acompanha a aba.** Um resumo fixo contradiria a lista: a pessoa veria
 * duas atrasadas e um painel falando de cinco demandas, e passaria a não
 * confiar em nenhum dos dois.
 *
 * As barras são relativas ao MAIS CARREGADO, não ao total. A pergunta aqui é
 * "quem está pior que quem", não "que fatia cada um representa" — e com três
 * itens a fatia vira barra minúscula que não compara nada.
 */
function Lista({
  title,
  itens,
  vazio,
}: {
  title: string;
  itens: { id: string | null; name: string; count: number; color?: string }[];
  vazio: string;
}) {
  const maior = itens[0]?.count ?? 0;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-fg text-[length:var(--text-small-size)] font-medium">
        {title}
      </h3>

      {itens.length === 0 ? (
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          {vazio}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {itens.map((item) => (
            <li key={item.id ?? "sem"} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-fg-secondary min-w-0 truncate text-[length:var(--text-small-size)]">
                  {item.name}
                </span>
                <span className="tnum text-fg shrink-0 text-[length:var(--text-small-size)]">
                  {item.count}
                </span>
              </div>
              <ProgressBar
                thin
                value={maior > 0 ? (item.count / maior) * 100 : 0}
                color={item.color}
                label={`${item.name}: ${item.count}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PendingDistributionCard({
  distribution,
  total,
}: {
  distribution: Distribution;
  /** Quantas demandas o filtro ativo tem — o que as barras somam. */
  total: number;
}) {
  return (
    <section className="border-line bg-card flex flex-col gap-5 rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-fg text-[length:var(--text-h3-size)] font-medium">
          Distribuição das pendências
        </h2>
        <span className="border-line text-fg-secondary shrink-0 rounded-full border px-2 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap">
          {total === 1 ? "1 pendência" : `${total} pendências`}
        </span>
      </div>

      <Lista
        title="Por setor"
        itens={distribution.porSetor}
        vazio="Nada neste filtro"
      />
      <Lista
        title="Por responsável"
        itens={distribution.porPessoa}
        vazio="Nada neste filtro"
      />
    </section>
  );
}
