import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { SEGMENTOS } from "@/lib/landing/conteudo";

/**
 * Os quatro segmentos.
 *
 * O "Ver aplicação →" do Figma é um LINK, e nesta versão da página ele
 * não tem para onde ir: não existe página por segmento no projeto. Em
 * vez de deixar uma âncora morta — que aparece na navegação por teclado
 * e não faz nada —, ele aponta para a demonstração de produto, que é o
 * lugar mais próximo do que ele promete. Registrado na entrega.
 */
export function SegmentsSection() {
  return (
    <Secao id="para-quem" fundo="superficie" rotuladoPor="lp-segmentos">
      <Coluna className="py-16 lg:py-24">
        <TituloDeSecao
          id="lp-segmentos"
          eyebrow={SEGMENTOS.eyebrow}
          titulo={SEGMENTOS.titulo}
          intro={SEGMENTOS.intro}
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {SEGMENTOS.cards.map((card, i) => (
            <Reveal key={card.iniciais} ordem={i} className="h-full">
              <article className="lp-card flex h-full gap-5 rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-page)] p-6">
                <span
                  aria-hidden="true"
                  className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[16px] bg-[var(--taflow-bg-accent)] text-[15px] font-bold text-[var(--taflow-text-primary)]"
                >
                  {card.iniciais}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[20px] leading-[28px] font-semibold text-[var(--taflow-text-primary)]">
                    {card.titulo}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-[var(--taflow-text-secondary)]">
                    {card.corpo}
                  </p>
                  <a
                    href="#recursos"
                    className="lp-foco mt-4 inline-flex min-h-11 items-center text-[14px] font-medium text-[var(--taflow-text-primary)] underline underline-offset-4"
                  >
                    {SEGMENTOS.link}
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Coluna>
    </Secao>
  );
}
