import { CTAButton } from "@/components/landing/CTAButton";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao } from "@/components/landing/Secao";
import { CTA_FINAL, ROTA_CADASTRO, ROTA_LOGIN } from "@/lib/landing/conteudo";

/**
 * O fechamento.
 *
 * Seção escura com o Check Matrix oficial e duas manchas de luz — a
 * leitura de "Dark Veil" que o prompt pede, em versão contida: são dois
 * gradientes parados, sem neon e sem invadir as seções vizinhas.
 *
 * **O título e os botões não dependem do fundo.** Eles ficam numa camada
 * acima, com o contraste vindo do grafite sólido: cloud white sobre
 * #171717 dá 16.62:1, e o lime do CTA sobre grafite, 15.19:1. Mexer no
 * fundo não move nenhum dos dois.
 */
export function FinalCTA() {
  return (
    <Secao fundo="inverso" className="overflow-hidden" rotuladoPor="lp-fechamento">
      {/* Dark Veil: duas manchas, opacidade baixa, sem movimento. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-44 right-0 hidden h-[460px] w-[680px] lg:block"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(199,255,56,0.14), rgba(199,255,56,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/3 hidden h-[420px] w-[600px] lg:block"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(174,231,196,0.10), rgba(174,231,196,0) 72%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- pattern
          vetorial da marca; o otimizador do Next recusa SVG. */}
      <img
        src="/marca/patterns/pattern-check-matrix.svg"
        alt=""
        aria-hidden="true"
        width={320}
        height={240}
        className="pointer-events-none absolute right-12 bottom-10 hidden w-[320px] opacity-90 xl:block"
      />

      <Coluna className="relative z-10 py-16 lg:py-24">
        <Reveal>
          <span className="inline-flex h-[38px] items-center rounded-full border border-[rgba(199,255,56,0.35)] bg-[var(--taflow-bg-inverse-soft)] px-4 text-[10px] font-semibold tracking-[0.08em] text-[var(--taflow-bg-accent)]">
            {CTA_FINAL.selo}
          </span>
        </Reveal>

        <Reveal ordem={1}>
          <h2
            id="lp-fechamento"
            className="mt-8 max-w-[920px] text-[clamp(30px,4.8vw,48px)] leading-[1.19] font-semibold tracking-[-0.025em] text-[var(--taflow-text-inverse)]"
          >
            {CTA_FINAL.titulo.map((linha) => (
              <span key={linha} className="block max-lg:inline">
                {linha}{" "}
              </span>
            ))}
          </h2>
        </Reveal>

        <Reveal ordem={2}>
          <p className="mt-6 max-w-[720px] text-[18px] leading-[30px] text-[var(--taflow-text-secondary-inverse)]">
            {CTA_FINAL.corpo}
          </p>
        </Reveal>

        <Reveal ordem={3}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <CTAButton href={ROTA_CADASTRO} seta="diagonal">
              {CTA_FINAL.ctaPrimario}
            </CTAButton>
            <CTAButton href={ROTA_LOGIN} variante="contorno">
              {CTA_FINAL.ctaSecundario}
            </CTAButton>
          </div>
        </Reveal>

        <Reveal ordem={4}>
          <p className="mt-8 text-[12px] leading-[18px] text-[var(--taflow-text-secondary-inverse)]">
            {CTA_FINAL.nota}
          </p>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
