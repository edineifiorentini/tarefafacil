import { Coluna, Secao } from "@/components/landing/Secao";
import { Reveal } from "@/components/landing/Reveal";
import { PUBLICO } from "@/lib/landing/conteudo";

/**
 * A faixa de identificação do público.
 *
 * É a seção mais curta da página (250px no Figma) e o papel dela é um
 * só: quem chegou reconhecer o próprio trabalho na lista em dois
 * segundos. Por isso são etiquetas, não cards — nada aqui pede leitura.
 */
export function AudienceChips() {
  return (
    <Secao id="para-quem-topo" fundo="superficie" rotuladoPor="lp-publico">
      <Coluna className="py-14 lg:py-16">
        <Reveal>
          <h2
            id="lp-publico"
            className="mx-auto max-w-[1000px] text-center text-[clamp(20px,2.4vw,26px)] leading-[1.3] font-semibold tracking-[-0.02em] text-[var(--taflow-text-primary)]"
          >
            {PUBLICO.titulo}
          </h2>
        </Reveal>

        {/* A lista inteira revela de uma vez.
            Um `Reveal` por etiqueta exigiria um wrapper entre `ul` e
            `li` — HTML inválido — e `display: contents` no wrapper
            apagaria a caixa, deixando opacidade e transform sem efeito.
            São seis palavras curtas: escaloná-las só faria esperar. */}
        <Reveal ordem={1}>
          <ul className="mt-9 flex flex-wrap justify-center gap-3">
            {PUBLICO.chips.map((chip) => (
              <li
                key={chip}
                className="lp-card flex h-10 items-center rounded-full border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-page)] px-5 text-[13px] font-medium text-[var(--taflow-text-primary)]"
              >
                {chip}
              </li>
            ))}
          </ul>
        </Reveal>
      </Coluna>
    </Secao>
  );
}
