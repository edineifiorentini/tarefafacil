import { MarcaIcone } from "@/components/landing/MarcaIcone";
import { Reveal } from "@/components/landing/Reveal";
import { Coluna, Secao, TituloDeSecao } from "@/components/landing/Secao";
import { CONFIANCA } from "@/lib/landing/conteudo";

/**
 * Confiança.
 *
 * **Sem selo, sem certificação, sem número de cliente.** A seção fala do
 * que o sistema faz — histórico, responsável, contexto — porque é o que
 * dá para sustentar. Um selo de segurança inventado numa LP é o tipo de
 * coisa que vira problema jurídico, não conversão.
 *
 * O primeiro card tem o ícone em lime e os outros em cinza: é a
 * hierarquia do Figma, não aleatório.
 */
export function TrustSection() {
  return (
    <Secao fundo="pagina" rotuladoPor="lp-confianca">
      <Coluna className="py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <TituloDeSecao
              id="lp-confianca"
              eyebrow={CONFIANCA.eyebrow}
              titulo={CONFIANCA.titulo}
              classeTitulo="text-[clamp(28px,3.6vw,40px)]"
            />
            <Reveal ordem={2}>
              <p className="mt-8 max-w-[500px] text-[16px] leading-[26px] text-[var(--taflow-text-secondary)]">
                {CONFIANCA.corpo}
              </p>
            </Reveal>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {CONFIANCA.cards.map((card, i) => (
              <Reveal key={card.titulo} ordem={i} className="h-full">
                <article className="lp-card flex h-full flex-col rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] p-5">
                  <span
                    className={`grid h-[46px] w-[46px] place-items-center rounded-[15px] ${
                      card.destaque
                        ? "bg-[var(--taflow-bg-accent)]"
                        : "bg-[var(--taflow-bg-subtle)]"
                    }`}
                  >
                    <MarcaIcone nome={card.icone} tamanho={34} />
                  </span>
                  <h3 className="mt-6 text-[18px] leading-[26px] font-semibold text-[var(--taflow-text-primary)]">
                    {card.titulo}
                  </h3>
                  <p className="mt-3 text-[13px] leading-[21px] text-[var(--taflow-text-secondary)]">
                    {card.corpo}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Coluna>
    </Secao>
  );
}
