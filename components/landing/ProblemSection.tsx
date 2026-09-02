import { MarcaIcone } from "@/components/landing/MarcaIcone";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { PROBLEMA } from "@/lib/landing/conteudo";

/**
 * Os três problemas.
 *
 * Cada card carrega um índice (01, 02, 03), um ícone oficial e uma
 * barrinha no rodapé cuja LARGURA muda por card — no Figma o segundo vai
 * de ponta a ponta e os outros dois ficam curtos. Não é enfeite: é a
 * própria seção dizendo qual dor pesa mais.
 */

function PainCard({
  indice,
  icone,
  titulo,
  corpo,
  progresso,
}: (typeof PROBLEMA.cards)[number]) {
  return (
    <article className="lp-card flex h-full flex-col rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-[30px] items-center rounded-[8px] bg-[var(--taflow-bg-subtle)] px-3 text-[12px] font-semibold text-[var(--taflow-text-primary)]">
          {indice}
        </span>
        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] bg-[var(--taflow-bg-accent-soft)]">
          <MarcaIcone nome={icone} tamanho={40} />
        </span>
      </div>

      <h3 className="mt-7 text-[22px] leading-[32px] font-semibold text-[var(--taflow-text-primary)]">
        {titulo}
      </h3>
      <p className="mt-3 text-[15px] leading-[24px] text-[var(--taflow-text-secondary)]">
        {corpo}
      </p>

      {/* A barra fica colada no fundo do card, com `mt-auto`, para os
          três cards terminarem na mesma linha mesmo com textos de
          alturas diferentes.

          A medida do Figma entra como TETO, não como largura. Largura
          fixa num descendente de item de grid entra na conta do
          `min-content` e estica a coluna inteira: os 344px do segundo
          card empurravam a página para 418px num celular de 375. */}
      <span
        aria-hidden="true"
        className="mt-auto block h-1 w-full rounded-full bg-[var(--taflow-bg-accent)]"
        style={{ maxWidth: progresso }}
      />
    </article>
  );
}

export function ProblemSection() {
  return (
    <Secao id="produto" fundo="pagina" rotuladoPor="lp-problema">
      <Coluna className="py-16 lg:py-24">
        <TituloDeSecao
          id="lp-problema"
          eyebrow={PROBLEMA.eyebrow}
          titulo={PROBLEMA.titulo}
          intro={PROBLEMA.intro}
          classeTitulo="text-[clamp(30px,4.6vw,48px)]"
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PROBLEMA.cards.map((card, i) => (
            <Reveal key={card.indice} ordem={i} className="h-full">
              <PainCard {...card} />
            </Reveal>
          ))}
        </div>

        <Reveal ordem={3}>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6">
            <p className="max-w-[800px] text-[18px] leading-[28px] font-medium text-[var(--taflow-text-primary)]">
              {PROBLEMA.fecho}
            </p>
            <a
              href="#como-funciona"
              className="lp-foco inline-flex min-h-11 items-center rounded-full border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] px-5 text-[12px] font-semibold tracking-[0.04em] text-[var(--taflow-text-primary)]"
            >
              {PROBLEMA.ponte}
            </a>
          </div>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
