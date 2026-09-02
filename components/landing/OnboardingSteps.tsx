import { CTAButton } from "@/components/landing/CTAButton";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { COMECO, ROTA_CADASTRO } from "@/lib/landing/conteudo";

/**
 * Como começar — quatro passos.
 *
 * A seta no canto de cada card aponta para o próximo, e por isso o
 * ÚLTIMO não tem: seta no quarto card prometeria um quinto passo que
 * não existe. É detalhe do Figma que só aparece contando os elementos.
 *
 * A linha que liga os passos some abaixo de `lg` junto com a fileira,
 * pelo mesmo motivo da seção de fluxo.
 */
export function OnboardingSteps() {
  return (
    <Secao fundo="pagina" rotuladoPor="lp-comeco">
      <Coluna className="py-16 lg:py-24">
        <TituloDeSecao
          id="lp-comeco"
          eyebrow={COMECO.eyebrow}
          titulo={COMECO.titulo}
          intro={COMECO.intro}
        />

        <div className="relative mt-14">
          {/* O trilho por trás dos números. */}
          <span
            aria-hidden="true"
            className="absolute top-[47px] right-[12%] left-[12%] hidden h-px bg-[var(--taflow-border-default)] lg:block"
          />

          <ol className="relative grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {COMECO.passos.map((passo, i) => (
              <li key={passo.numero} className="h-full">
                <Reveal ordem={i} className="h-full">
                  <div className="lp-card relative flex h-full flex-col rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] p-6">
                    <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[var(--taflow-bg-subtle)] text-[12px] font-semibold text-[var(--taflow-text-primary)]">
                      {passo.numero}
                    </span>
                    <h3 className="mt-6 text-[20px] leading-[28px] font-semibold text-[var(--taflow-text-primary)]">
                      {passo.titulo}
                    </h3>
                    <p className="mt-3 text-[14px] leading-[22px] text-[var(--taflow-text-secondary)]">
                      {passo.corpo}
                    </p>
                    {i < COMECO.passos.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="mt-auto self-end pt-6 text-[18px] font-semibold text-[var(--taflow-text-primary)]"
                      >
                        →
                      </span>
                    ) : null}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal ordem={2}>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-[24px] border border-[var(--taflow-bg-accent)] bg-[var(--taflow-bg-accent-soft)] px-6 py-6">
            <p className="max-w-[650px] text-[20px] leading-[30px] font-semibold text-[var(--taflow-text-primary)]">
              {COMECO.faixa.titulo}
            </p>
            <CTAButton href={ROTA_CADASTRO} variante="inverso" seta="diagonal">
              {COMECO.faixa.cta}
            </CTAButton>
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
