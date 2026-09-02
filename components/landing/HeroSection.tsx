import { CTAButton } from "@/components/landing/CTAButton";
import { MotionBackground } from "@/components/landing/MotionBackground";
import {
  CartaoAprovacao,
  ProductPreview,
} from "@/components/landing/ProductPreview";
import { Coluna, Secao } from "@/components/landing/Secao";
import { HERO, ROTA_CADASTRO } from "@/lib/landing/conteudo";

/**
 * O hero.
 *
 * Server Component. O único JavaScript que entra aqui é o `CTAButton`
 * (reflexo do cursor) e o `MotionBackground` (parallax) — o texto, a
 * manchete e o mockup inteiro saem prontos do servidor, que é o que
 * mantém o LCP sendo texto e não um efeito.
 *
 * A sequência de entrada segue os tempos pedidos: eyebrow em 120ms,
 * manchete revelada linha a linha a partir de 180ms com 70ms entre
 * linhas, corpo em 260ms, botões em 340ms e o mockup em 380ms. É
 * animação de CSS com `both`, então nada depende de script para
 * aparecer.
 */
export function HeroSection() {
  return (
    <Secao
      fundo="pagina"
      className="overflow-hidden"
      rotuladoPor="lp-hero-titulo"
    >
      <MotionBackground />

      <Coluna className="relative z-10 pt-10 pb-16 lg:pt-14 lg:pb-24">
        {/* No Figma (1440) a coluna de texto tem 610px e o mockup 608.
            O `minmax(420px, …)` é o que impede o mockup de espremer o
            texto em telas menores: sem ele, em 1120 sobravam 344px para
            a manchete e ela quebrava em três linhas. */}
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(420px,1fr)_minmax(0,608px)] lg:gap-10">
          {/* Coluna do texto */}
          <div className="max-w-[620px]">
            <p
              className="lp-in inline-flex items-center rounded-full border border-[var(--taflow-bg-accent)] bg-[var(--taflow-bg-accent-soft)] px-4 py-2 text-[11px] leading-[18px] font-semibold tracking-[0.06em] text-[var(--taflow-text-primary)]"
              style={{ ["--lp-in" as string]: "120ms" }}
            >
              {HERO.eyebrow}
            </p>

            <h1
              id="lp-hero-titulo"
              // 4.7vw dá exatamente os 68px do Figma em 1440 e desce
              // junto com a tela: 60px em 1280, 53px em 1120. Com 6.2vw
              // o título batia no teto cedo demais e transbordava a
              // coluna em qualquer largura intermediária.
              className="mt-6 text-[clamp(34px,4.7vw,68px)] leading-[1.06] font-bold tracking-[-0.035em] text-[var(--taflow-text-primary)]"
            >
              {HERO.titulo.map((linha, i) => (
                // O `overflow-hidden` é a máscara: a linha sobe de baixo
                // dela, em vez de simplesmente aparecer.
                <span key={linha} className="block overflow-hidden">
                  <span
                    className="lp-in-line block"
                    style={{ ["--lp-in" as string]: `${180 + i * 70}ms` }}
                  >
                    {linha}
                    {/* Espaço para o leitor de tela: sem ele o título
                        acessível vira "Cresça semperder o fluxo." */}
                    {i < HERO.titulo.length - 1 ? " " : null}
                  </span>
                </span>
              ))}
            </h1>

            <p
              className="lp-in mt-6 max-w-[575px] text-[18px] leading-[30px] text-[var(--taflow-text-secondary)]"
              style={{ ["--lp-in" as string]: "260ms" }}
            >
              {HERO.corpo}
            </p>

            <div
              className="lp-in mt-9 flex flex-wrap items-center gap-3"
              style={{ ["--lp-in" as string]: "340ms" }}
            >
              <CTAButton href={ROTA_CADASTRO} seta="diagonal">
                {HERO.ctaPrimario}
              </CTAButton>
              <CTAButton
                href="#como-funciona"
                variante="secundario"
                seta="direita"
              >
                {HERO.ctaSecundario}
              </CTAButton>
            </div>

            <p
              className="lp-in mt-6 text-[13px] leading-[20px] font-medium text-[var(--taflow-text-secondary)]"
              style={{ ["--lp-in" as string]: "420ms" }}
            >
              {HERO.microcopy}
            </p>
          </div>

          {/* Coluna do produto */}
          <div
            className="lp-in-mock relative"
            style={{ ["--lp-in" as string]: "380ms" }}
          >
            <ProductPreview />

            {/* O cartão pousa no canto, como no Figma. Some no celular:
                ali ele cobriria o próprio mockup. */}
            <div className="absolute -bottom-7 left-6 hidden w-[280px] sm:block lg:-right-6 lg:left-auto">
              <CartaoAprovacao />
            </div>
          </div>
        </div>
      </Coluna>
    </Secao>
  );
}
