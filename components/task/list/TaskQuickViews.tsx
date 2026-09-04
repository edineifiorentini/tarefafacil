"use client";

import { VISOES, type VisaoRapida } from "@/lib/task/quick-views";

/**
 * As seis perguntas que alguém faz ao abrir a Lista, em forma de botão.
 *
 * Elas substituem o seletor "Status: Todas" que a tela tinha antes — um
 * campo que dizia "Todas" ao lado de outros quatro campos dizendo "Todas",
 * e onde a resposta útil ("o que está aberto") era só mais uma opção
 * escondida.
 *
 * **As contagens vêm da lista já filtrada.** Se alguém filtrou o setor de
 * Obras, "Atrasadas 4" precisa dizer quatro em Obras — o total do workspace
 * ali seria um número que não bate com nada na tela.
 *
 * `role="tablist"` com `aria-selected`: é navegação entre recortes do mesmo
 * conteúdo, e é assim que um leitor de tela a anuncia. As setas do teclado
 * andam entre elas, como se espera de abas.
 */
export function TaskQuickViews({
  atual,
  contagens,
  onChange,
}: {
  atual: VisaoRapida;
  contagens: Record<VisaoRapida, number>;
  onChange: (v: VisaoRapida) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Visualizações rápidas"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {VISOES.map((v) => {
        const ativa = atual === v.value;
        const n = contagens[v.value];

        return (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(v.value)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
              ativa
                ? "border-transparent font-medium"
                : "border-line text-fg-secondary hover:border-line-strong hover:text-fg"
            }`}
            style={
              ativa
                ? {
                    // Menta bem suave, não a cor da marca cheia: são seis
                    // chips lado a lado, e um deles saturado brigaria com o
                    // conteúdo da tabela logo abaixo.
                    background: "var(--status-positive-bg)",
                    color: "var(--status-positive-fg)",
                  }
                : undefined
            }
          >
            {v.label}
            <span
              className={`tnum rounded-full px-1.5 text-[length:var(--text-caption-size)] ${
                ativa ? "" : "bg-sunken"
              }`}
              style={
                ativa
                  ? { background: "color-mix(in srgb, currentColor 14%, transparent)" }
                  : undefined
              }
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
