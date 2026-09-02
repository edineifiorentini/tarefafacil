"use client";

import { useState } from "react";

import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { DUVIDAS, WHATSAPP_URL } from "@/lib/landing/conteudo";

/**
 * As dúvidas frequentes.
 *
 * Cada pergunta é um `<button>` de verdade dentro de um heading, com
 * `aria-expanded` e `aria-controls` — não um `div` com `onClick`. É o
 * que faz a lista ser navegável por teclado e anunciada como "botão,
 * recolhido".
 *
 * **Uma aberta por vez**, como o Figma sugere ao desenhar as seis
 * fechadas. A resposta NUNCA é removida do DOM: ela fica com altura
 * zero e `hidden`, então o leitor de tela não a lê fechada, mas o
 * conteúdo existe para busca do navegador e para quem imprime.
 *
 * Quatro das seis respostas estão marcadas com `TODO(product-rule)` em
 * `conteudo.ts` — são regras comerciais que ninguém confirmou, e
 * escrever uma resposta plausível seria inventar contrato.
 */
export function FAQAccordion() {
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <Secao id="duvidas" fundo="superficie" rotuladoPor="lp-duvidas">
      <Coluna className="py-16 lg:py-24">
        <TituloDeSecao
          id="lp-duvidas"
          eyebrow={DUVIDAS.eyebrow}
          titulo={DUVIDAS.titulo}
          intro={DUVIDAS.intro}
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {DUVIDAS.itens.map((item, i) => {
            const estaAberta = aberta === item.id;
            const pendente = item.resposta.startsWith("TODO(product-rule)");
            return (
              <Reveal key={item.id} ordem={i % 2} className="h-full">
                <div
                  className={`rounded-[18px] border bg-[var(--taflow-bg-surface)] transition-colors [transition-duration:var(--dur-fast)] ${
                    estaAberta
                      ? "border-[var(--taflow-text-primary)]"
                      : "border-[var(--taflow-border-default)]"
                  }`}
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={estaAberta}
                      aria-controls={`lp-faq-${item.id}`}
                      onClick={() => setAberta(estaAberta ? null : item.id)}
                      className="lp-foco flex w-full items-center justify-between gap-4 px-6 py-6 text-left"
                    >
                      <span className="text-[17px] leading-[24px] font-semibold text-[var(--taflow-text-primary)]">
                        {item.pergunta}
                      </span>
                      <span
                        aria-hidden="true"
                        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] bg-[var(--taflow-bg-subtle)] text-[24px] leading-none text-[var(--taflow-text-primary)] transition-transform [transition-duration:var(--dur-base)]"
                        style={{
                          transform: estaAberta ? "rotate(45deg)" : undefined,
                        }}
                      >
                        +
                      </span>
                    </button>
                  </h3>

                  {/* `hidden` em vez de desmontar: o texto continua no
                      documento para busca e impressão, e sai da árvore
                      de acessibilidade quando fechado. */}
                  <div id={`lp-faq-${item.id}`} hidden={!estaAberta}>
                    <p
                      className={`px-6 pb-6 text-[14px] leading-[23px] ${
                        pendente
                          ? "font-mono text-[var(--taflow-status-danger)]"
                          : "text-[var(--taflow-text-secondary)]"
                      }`}
                    >
                      {item.resposta}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal ordem={2}>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-[24px] border border-[var(--taflow-bg-accent)] bg-[var(--taflow-bg-accent-soft)] px-6 py-7">
            <div className="min-w-0">
              <p className="text-[20px] leading-[28px] font-semibold text-[var(--taflow-text-primary)]">
                {DUVIDAS.contato.titulo}
              </p>
              <p className="mt-2 max-w-[700px] text-[14px] leading-[22px] text-[var(--taflow-text-secondary)]">
                {DUVIDAS.contato.corpo}
              </p>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-cta lp-foco inline-flex min-h-[58px] items-center justify-center rounded-[16px] bg-[var(--taflow-bg-inverse)] px-6 text-[14px] font-semibold text-[var(--taflow-text-inverse)]"
            >
              {DUVIDAS.contato.cta}
            </a>
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
