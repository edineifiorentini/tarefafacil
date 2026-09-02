import { MarcaIcone } from "@/components/landing/MarcaIcone";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { BENEFICIOS } from "@/lib/landing/conteudo";

/**
 * Os quatro benefícios.
 *
 * No Figma o título fica à esquerda e a introdução à direita, na mesma
 * linha — layout que só faz sentido com largura sobrando, então abaixo
 * de `lg` eles empilham na ordem natural de leitura.
 *
 * A faixa "VISÃO DO GESTOR" no rodapé é a única peça com seta: ela
 * fecha a seção apontando para a próxima.
 */
export function BenefitsSection() {
  return (
    <Secao fundo="pagina" rotuladoPor="lp-beneficios">
      <Coluna className="py-16 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-16">
          <TituloDeSecao
            id="lp-beneficios"
            eyebrow={BENEFICIOS.eyebrow}
            titulo={BENEFICIOS.titulo}
          />
          <Reveal ordem={2}>
            <p className="max-w-[584px] text-[17px] leading-[28px] text-[var(--taflow-text-secondary)]">
              {BENEFICIOS.intro}
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {BENEFICIOS.cards.map((card, i) => (
            <Reveal key={card.titulo} ordem={i} className="h-full">
              <article className="lp-card flex h-full flex-col rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] p-6">
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[var(--taflow-bg-accent-soft)]">
                  <MarcaIcone nome={card.icone} tamanho={36} />
                </span>
                <h3 className="mt-5 text-[20px] leading-[28px] font-semibold text-[var(--taflow-text-primary)]">
                  {card.titulo}
                </h3>
                <p className="mt-3 text-[14px] leading-[22px] text-[var(--taflow-text-secondary)]">
                  {card.corpo}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal ordem={3}>
          <div className="mt-10 flex flex-wrap items-center gap-6 rounded-[20px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] px-6 py-6">
            <span className="text-[12px] font-semibold tracking-[0.04em] text-[var(--taflow-text-secondary)]">
              {BENEFICIOS.gestor.rotulo}
            </span>
            <p className="min-w-0 flex-1 text-[18px] leading-[30px] font-medium text-[var(--taflow-text-primary)]">
              {BENEFICIOS.gestor.frase}
            </p>
            <span
              aria-hidden="true"
              className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[16px] bg-[var(--taflow-bg-accent)] text-[20px] font-semibold text-[var(--taflow-text-primary)]"
            >
              →
            </span>
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
