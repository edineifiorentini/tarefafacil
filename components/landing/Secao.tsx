import type { ReactNode } from "react";

import { Reveal } from "./Reveal";

/**
 * A casca de uma seção da landing page.
 *
 * O frame do Figma tem 1440px com margem de 96px de cada lado, o que dá
 * uma coluna de 1248px. Aqui isso vira `max-width` mais padding fluido,
 * em vez de largura fixa: o design é a referência de proporção, não uma
 * régua para colar em pixel.
 *
 * O fundo de cada seção também vem do Figma e alterna de propósito —
 * página, superfície branca e grafite — para dar ritmo à rolagem.
 */

type Fundo = "pagina" | "superficie" | "inverso";

const FUNDOS: Record<Fundo, string> = {
  pagina: "bg-[var(--taflow-bg-page)]",
  superficie: "bg-[var(--taflow-bg-surface)]",
  inverso: "bg-[var(--taflow-bg-inverse)]",
};

export function Secao({
  id,
  fundo = "pagina",
  children,
  className,
  rotuladoPor,
}: {
  id?: string;
  fundo?: Fundo;
  children: ReactNode;
  className?: string;
  /** id do heading que nomeia a seção, para leitor de tela. */
  rotuladoPor?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={rotuladoPor}
      className={`relative ${FUNDOS[fundo]} ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

/** A coluna de 1248px, com respiro que encolhe junto com a tela. */
export function Coluna({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-6 sm:px-10 lg:px-16 xl:px-[var(--lp-gutter)] ${className ?? ""}`}
      style={{ maxWidth: "calc(var(--lp-content) + 2 * var(--lp-gutter))" }}
    >
      {children}
    </div>
  );
}

/**
 * O par eyebrow + título que abre quase toda seção.
 *
 * O título aceita array porque várias seções do Figma quebram a linha
 * num ponto escolhido — "Clareza para decidir. / Fluxo para avançar." —
 * e deixar o navegador quebrar sozinho perderia o ritmo. No mobile a
 * quebra some, porque ali ela atrapalharia.
 */
export function TituloDeSecao({
  id,
  eyebrow,
  titulo,
  intro,
  nivel = "h2",
  inverso = false,
  className,
  larguraTitulo,
  classeTitulo,
}: {
  id?: string;
  eyebrow?: string;
  titulo: string | readonly string[];
  intro?: string;
  nivel?: "h1" | "h2";
  inverso?: boolean;
  className?: string;
  larguraTitulo?: string;
  /** O Figma varia o corpo do título por seção (40, 44 e 48px). */
  classeTitulo?: string;
}) {
  const Tag = nivel;
  const linhas = typeof titulo === "string" ? [titulo] : titulo;
  const corTitulo = inverso
    ? "text-[var(--taflow-text-inverse)]"
    : "text-[var(--taflow-text-primary)]";
  const corApoio = inverso
    ? "text-[var(--taflow-text-secondary-inverse)]"
    : "text-[var(--taflow-text-secondary)]";

  return (
    <div className={className}>
      {eyebrow ? (
        <Reveal>
          <p
            className={`text-[12px] leading-[18px] font-semibold tracking-[0.04em] ${corApoio}`}
          >
            {eyebrow}
          </p>
        </Reveal>
      ) : null}

      <Reveal ordem={eyebrow ? 1 : 0}>
        <Tag
          id={id}
          className={`mt-3 leading-[1.14] font-semibold tracking-[-0.025em] ${classeTitulo ?? "text-[clamp(30px,4.2vw,44px)]"} ${corTitulo}`}
          style={larguraTitulo ? { maxWidth: larguraTitulo } : undefined}
        >
          {/* O espaço depois de cada linha é para o LEITOR DE TELA, não
              para a tela: sem ele o texto acessível vira "decidirFluxo".
              Visualmente ele não custa nada — o `block` já quebrou a
              linha, e espaço no fim de linha é colapsado. */}
          {linhas.map((linha, i) => (
            <span key={linha} className="block max-lg:inline">
              {linha}
              {i < linhas.length - 1 ? " " : null}
            </span>
          ))}
        </Tag>
      </Reveal>

      {intro ? (
        <Reveal ordem={2}>
          <p
            className={`mt-5 max-w-[62ch] text-[17px] leading-[28px] ${corApoio}`}
          >
            {intro}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
