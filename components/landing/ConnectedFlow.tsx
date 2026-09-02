"use client";

import { useEffect, useRef } from "react";

import { MarcaIcone } from "@/components/landing/MarcaIcone";
import { Preenche } from "@/components/landing/Preenche";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { FLUXO } from "@/lib/landing/conteudo";

/**
 * O fluxo conectado — a seção escura.
 *
 * É a seção que precisa comunicar continuidade, não uma lista de
 * funcionalidades. Por isso o conector: uma linha que percorre as seis
 * etapas e se desenha UMA vez, quando a seção entra. Depois ela para.
 * Linha que fica correndo em laço vira letreiro de loja.
 *
 * O desenho usa `stroke-dasharray`/`stroke-dashoffset` — a técnica que
 * anima traço sem repintar geometria. Com movimento reduzido a linha já
 * nasce inteira (ver `.lp-flow-line` no globals.css).
 *
 * Abaixo de `lg` os cards empilham e o conector some: uma linha
 * horizontal ligando cards que agora estão em coluna não liga nada.
 */

function Conector() {
  const ref = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // O comprimento real do traço vira a variável que o CSS usa como
    // dasharray. Medir é melhor que chutar: um valor menor que o
    // comprimento deixaria a linha "pronta" antes da hora.
    const comprimento = el.getTotalLength();
    el.style.setProperty("--lp-line-length", `${comprimento}`);

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <svg
      viewBox="0 0 1110 2"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-x-[6%] top-[38%] hidden h-[2px] w-[88%] lg:block"
    >
      <path
        ref={ref}
        className="lp-flow-line"
        d="M 0 1 L 1110 1"
        stroke="var(--taflow-bg-accent)"
        strokeWidth="2"
        strokeOpacity="0.55"
        vectorEffect="non-scaling-stroke"
        fill="none"
      />
    </svg>
  );
}

export function ConnectedFlow() {
  return (
    <Secao
      id="como-funciona"
      fundo="inverso"
      className="overflow-hidden"
      rotuladoPor="lp-fluxo"
    >
      {/* Route Lines oficial, no canto superior direito, e o halo que o
          Figma põe atrás dele. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 hidden h-[560px] w-[560px] rounded-full lg:block"
        style={{
          background:
            "radial-gradient(circle, rgba(199,255,56,0.10), rgba(199,255,56,0) 70%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- pattern
          vetorial da marca; o otimizador do Next recusa SVG. */}
      <img
        src="/marca/patterns/pattern-route-lines.svg"
        alt=""
        aria-hidden="true"
        width={320}
        height={240}
        className="pointer-events-none absolute top-6 right-8 hidden w-[320px] opacity-60 xl:block"
      />

      <Coluna className="relative z-10 py-16 lg:py-24">
        <TituloDeSecao
          id="lp-fluxo"
          eyebrow={FLUXO.eyebrow}
          titulo={FLUXO.titulo}
          intro={FLUXO.corpo}
          inverso
          preencher
        />

        <div className="relative mt-16">
          <Conector />

          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FLUXO.etapas.map((etapa, i) => (
              <li key={etapa.numero}>
                <Reveal ordem={i} passo={70} tetoMs={420}>
                  <div className="lp-card flex h-full min-h-[170px] flex-col rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[var(--taflow-bg-inverse-soft)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex h-[34px] items-center rounded-[10px] bg-[rgba(255,255,255,0.08)] px-3 text-[12px] font-semibold text-[var(--taflow-text-inverse)]">
                        {etapa.numero}
                      </span>
                      {/* Ícone da versão `dark` — é a `/ Negative` do
                          Figma, desenhada para fundo grafite. */}
                      <MarcaIcone nome={etapa.icone} tom="dark" tamanho={40} />
                    </div>

                    <h3 className="mt-6 text-[19px] leading-[28px] font-semibold text-[var(--taflow-text-inverse)]">
                      {etapa.nome}
                    </h3>
                    <p className="mt-1 text-[13px] leading-[18px] text-[var(--taflow-text-secondary-inverse)]">
                      {etapa.descricao}
                    </p>

                    <span
                      aria-hidden="true"
                      className="mx-auto mt-auto block h-2.5 w-2.5 rounded-full bg-[var(--taflow-bg-accent)]"
                    />
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal ordem={2}>
          <div className="mt-12 grid gap-6 rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[var(--taflow-bg-inverse-soft)] px-7 py-7 lg:grid-cols-[auto_auto_1fr] lg:items-center lg:gap-10">
            <Preenche
              como="p"
              className="text-[20px] leading-[30px] font-semibold"
            >
              {FLUXO.resultado.primeiro}
            </Preenche>
            <Preenche
              como="p"
              className="text-[20px] leading-[30px] font-semibold"
            >
              {FLUXO.resultado.segundo}
            </Preenche>
            <p className="text-[14px] leading-[23px] text-[var(--taflow-text-secondary-inverse)] lg:text-right">
              {FLUXO.resultado.copy}
            </p>
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
