"use client";

import { useRef, useState } from "react";

import { ProductTabPanel } from "@/components/landing/ProductTabPanel";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { PRODUTO } from "@/lib/landing/conteudo";

/**
 * A demonstração de produto, em abas.
 *
 * Segue o padrão de abas do WAI-ARIA, e não seis botões que trocam um
 * `div`: `tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls` e
 * navegação pelas setas. É o que faz um leitor de tela anunciar "aba 2
 * de 6, selecionada" em vez de ler seis botões soltos.
 *
 * **Só a aba ativa é focável pelo Tab** (`tabIndex` -1 nas outras): num
 * conjunto de abas o Tab entra no grupo uma vez e as setas andam dentro
 * dele. Seis paradas de Tab seguidas seria o oposto do que se espera.
 *
 * Os seis painéis ficam montados na mesma célula do grid — ver
 * `.lp-tabpanel`. É o que mantém a altura estável na troca.
 *
 * O Figma abre com "Aprovação do cliente" ativa, e é assim que nasce.
 */
export function ProductTabs() {
  const [ativa, setAtiva] = useState<string>(PRODUTO.abaInicial);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // `string[]` e não a tupla literal do `as const`: o estado guarda o id
  // como string, e `indexOf` não aceita string contra união de literais.
  const ids: string[] = PRODUTO.abas.map((a) => a.id);

  function aoTeclar(e: React.KeyboardEvent<HTMLButtonElement>) {
    const atual = ids.indexOf(ativa);
    let proximo: number | null = null;

    if (e.key === "ArrowRight") proximo = (atual + 1) % ids.length;
    else if (e.key === "ArrowLeft") proximo = (atual - 1 + ids.length) % ids.length;
    else if (e.key === "Home") proximo = 0;
    else if (e.key === "End") proximo = ids.length - 1;
    if (proximo === null) return;

    e.preventDefault();
    const alvo = ids[proximo];
    setAtiva(alvo);
    // O foco acompanha a seleção: é o comportamento de "automatic
    // activation", que é o que se espera de abas com conteúdo já
    // carregado.
    refs.current[alvo]?.focus();
  }

  return (
    <Secao id="recursos" fundo="superficie" rotuladoPor="lp-produto">
      <Coluna className="py-16 lg:py-24">
        <TituloDeSecao
          id="lp-produto"
          eyebrow={PRODUTO.eyebrow}
          titulo={PRODUTO.titulo}
          intro={PRODUTO.corpo}
        />

        <Reveal ordem={1}>
          <div
            role="tablist"
            aria-label="Módulos do produto"
            className="mt-10 flex flex-wrap gap-2"
          >
            {PRODUTO.abas.map((aba) => {
              const selecionada = aba.id === ativa;
              return (
                <button
                  key={aba.id}
                  ref={(el) => {
                    refs.current[aba.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`lp-aba-${aba.id}`}
                  aria-selected={selecionada}
                  aria-controls={`lp-painel-${aba.id}`}
                  tabIndex={selecionada ? 0 : -1}
                  onClick={() => setAtiva(aba.id)}
                  onKeyDown={aoTeclar}
                  className={`lp-foco inline-flex min-h-11 items-center rounded-[12px] border px-4 text-[14px] font-medium transition-colors [transition-duration:var(--dur-fast)] ${
                    selecionada
                      ? "border-[var(--taflow-text-primary)] bg-[var(--taflow-text-primary)] text-[var(--taflow-text-inverse)]"
                      : "border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] text-[var(--taflow-text-secondary)] hover:text-[var(--taflow-text-primary)]"
                  }`}
                >
                  {aba.rotulo}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal ordem={2}>
          <div className="mt-8 grid">
            {PRODUTO.abas.map((aba) => {
              const selecionada = aba.id === ativa;
              return (
                <div
                  key={aba.id}
                  role="tabpanel"
                  id={`lp-painel-${aba.id}`}
                  aria-labelledby={`lp-aba-${aba.id}`}
                  data-ativo={selecionada ? "1" : "0"}
                  className="lp-tabpanel"
                >
                  <ProductTabPanel id={aba.id} />
                </div>
              );
            })}
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
