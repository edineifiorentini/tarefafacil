import { CTAButton } from "@/components/landing/CTAButton";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { PLANOS, ROTA_CADASTRO, WHATSAPP_URL } from "@/lib/landing/conteudo";

/**
 * Os planos.
 *
 * A annotation do componente no Figma é explícita: "Pricing card;
 * capacity and price are editable. **No unverified feature gate
 * claims**". Por isso os três cards listam os MESMOS recursos, com uma
 * única diferença real no "Sob medida" (implantação orientada) — dizer
 * que um recurso só existe no plano de cima seria exatamente o claim
 * não verificado que a nota proíbe.
 *
 * E o preço: "Preço a definir" é o texto do Figma, não um espaço em
 * branco meu. Ver os `TODO(product-rule)` em `conteudo.ts`.
 */
export function PricingSection() {
  return (
    <Secao id="planos" fundo="superficie" rotuladoPor="lp-planos">
      <Coluna className="py-16 lg:py-24">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <TituloDeSecao
            id="lp-planos"
            eyebrow={PLANOS.eyebrow}
            titulo={PLANOS.titulo}
            intro={PLANOS.intro}
            className="min-w-0 flex-1"
          />
          <Reveal ordem={1}>
            <span className="inline-flex h-[50px] items-center rounded-full border border-[var(--taflow-bg-accent)] bg-[var(--taflow-bg-accent-soft)] px-5 text-[10px] font-semibold tracking-[0.08em] text-[var(--taflow-text-primary)]">
              {PLANOS.selo}
            </span>
          </Reveal>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANOS.cards.map((plano, i) => {
            const destaque = plano.recomendado;
            const whatsapp = plano.destino === "whatsapp";
            return (
              <Reveal key={plano.id} ordem={i} className="h-full">
                <article
                  className={`lp-card relative flex h-full flex-col rounded-[28px] p-7 ${
                    destaque
                      ? "border-2 border-[var(--taflow-bg-accent)] bg-[var(--taflow-bg-accent-soft)] lg:-mt-6"
                      : "border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)]"
                  }`}
                >
                  {destaque ? (
                    <span className="absolute -top-[19px] left-7 inline-flex h-[38px] items-center rounded-full bg-[var(--taflow-bg-accent)] px-4 text-[10px] font-semibold tracking-[0.08em] text-[var(--taflow-text-primary)]">
                      {PLANOS.destaque}
                    </span>
                  ) : null}

                  <h3 className="text-[22px] leading-[1.4] font-semibold text-[var(--taflow-text-primary)]">
                    {plano.nome}
                  </h3>
                  <p className="mt-3 text-[14px] font-medium text-[var(--taflow-text-secondary)]">
                    {plano.capacidade}
                  </p>
                  <p className="mt-3 text-[30px] leading-[1.4] font-semibold text-[var(--taflow-text-primary)]">
                    {plano.preco}
                  </p>

                  <span
                    aria-hidden="true"
                    className="mt-5 block h-px bg-[var(--taflow-border-default)]"
                  />

                  <ul className="mt-5 flex flex-col gap-4">
                    {plano.itens.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-[14px] leading-[1.4] text-[var(--taflow-text-primary)]"
                      >
                        <span aria-hidden="true">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* `mt-auto` cola o CTA no rodapé: os três cards têm
                      alturas diferentes e o botão precisa alinhar. */}
                  <div className="mt-auto pt-8">
                    <CTAButton
                      href={whatsapp ? WHATSAPP_URL : ROTA_CADASTRO}
                      variante="inverso"
                      externo={whatsapp}
                      className="w-full"
                      ariaLabel={`${plano.cta} — plano ${plano.nome}`}
                    >
                      {plano.cta}
                    </CTAButton>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal ordem={2}>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[930px] text-[12px] leading-[18px] text-[var(--taflow-text-secondary)]">
              {PLANOS.nota}
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-foco inline-flex min-h-11 items-center text-[12px] font-medium text-[var(--taflow-text-primary)]"
            >
              {PLANOS.atendimento}
            </a>
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
