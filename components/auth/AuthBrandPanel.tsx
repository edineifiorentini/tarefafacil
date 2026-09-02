import { IconShieldCheck } from "@tabler/icons-react";

import { TaflowMark } from "@/components/branding/TaflowMark";

import { AuthBackground } from "./AuthBackground";

/**
 * O painel institucional — grafite, nos dois temas.
 *
 * Um componente só para as duas formas, e não um "painel desktop" mais um
 * "cabeçalho mobile": a frase da marca é a mesma coisa em qualquer
 * largura, e duplicá-la garantiria que um dia as duas cópias
 * discordassem. No celular ele encolhe para uma faixa no topo, com a
 * marca e a manchete; do `md` para cima vira coluna; do `lg` para cima a
 * manchete cresce para o tamanho display e o texto de apoio aparece.
 *
 * **A manchete é `<p>`, não `<h1>`.** O `<h1>` da página é "Bem-vindo de
 * volta", no formulário: é ele que diz onde a pessoa está e o que dá para
 * fazer aqui. Quem chega por leitor de tela procurando o título da página
 * precisa ouvir "entrar", não uma frase de marketing.
 *
 * **O que NÃO tem aqui, e é decisão, não esquecimento:** nenhum
 * depoimento, nenhum número, nenhum logo de cliente, nenhum selo, nenhum
 * print de painel. Tudo isso seria inventado — e prova social falsa é o
 * tipo de coisa que quem lê percebe. O que sustenta o painel é o espaço
 * vazio e a frase.
 *
 * Server Component. O único JavaScript é o `AuthBackground`, e mesmo ele
 * só decide se carrega o canvas DEPOIS da primeira pintura.
 */
export function AuthBrandPanel() {
  return (
    <section
      // A margem direita RESERVA a faixa da costura. Sem isto, no tablet a
      // curva branca passava por cima de "fluxo." — o texto continuava lá,
      // desenhado por baixo do preenchimento do SVG. Por isso `pl`/`pr`
      // separados e não `px`: `px` reescreveria os dois lados a cada
      // breakpoint e comeria a reserva de volta.
      className="relative isolate flex flex-col justify-between overflow-hidden px-6 pt-8 pb-14 sm:px-10 md:min-h-dvh md:py-10 md:pl-8 md:pr-[var(--auth-seam-w)] lg:py-12 lg:pl-12 xl:py-14 xl:pl-16"
      style={
        {
          backgroundColor: "var(--auth-brand-bg)",
          // A marca segue o TEMA (`--marca-tinta` é grafite no claro,
          // nuvem no escuro). Este painel não segue: ele é grafite
          // sempre. No tema claro isso desenhava a marca em #171717
          // sobre #171717 — presente no DOM, invisível na tela. Aqui a
          // tinta é fixada em nuvem, que é o que o painel pede.
          "--marca-tinta": "var(--auth-brand-fg)",
        } as React.CSSProperties
      }
    >
      <AuthBackground />

      {/* Texto sempre acima das camadas de atmosfera. */}
      <div className="relative z-10">
        <TaflowMark
          className="block"
          style={{ height: "var(--logo-login-h)", width: "auto" }}
        />
      </div>

      <div className="relative z-10 mt-6 md:mt-0">
        {/* No celular a manchete cai para o tamanho de h1: com o display
            de 34px ela ocupava três linhas e empurrava o formulário para
            fora da primeira tela — e o formulário é o conteúdo principal
            ali. Do `lg` para cima ela vira manchete de verdade.
            O `max-w` em `ch` fica NESTE elemento e não no pai: `ch` mede
            contra a fonte do próprio elemento, e no pai (16px) 15ch dava
            151px — a manchete quebrava em cinco linhas. */}
        <p
          className="max-w-[20ch] text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-[weight:var(--font-weight-bold)] tracking-[-0.02em] lg:max-w-[14ch] lg:text-[length:var(--text-display-size)] lg:leading-[var(--text-display-line)]"
          style={{ color: "var(--auth-brand-fg)" }}
        >
          Cresça sem perder o{" "}
          <span style={{ color: "var(--auth-accent)" }}>fluxo.</span>
        </p>

        {/* Some no celular: ali o que importa é o formulário aparecer sem
            rolagem, e a manchete já diz do que se trata. */}
        <p
          className="mt-6 hidden max-w-[34ch] text-[length:var(--text-body-size)] leading-[var(--text-body-line)] lg:block"
          style={{ color: "var(--auth-brand-fg-soft)" }}
        >
          Demandas, aprovações, contratos e cobranças trabalhando no mesmo
          lugar.
        </p>

        <p
          className="mt-8 hidden max-w-[42ch] items-center gap-2 text-[length:var(--text-small-size)] lg:flex"
          style={{ color: "var(--auth-brand-fg-muted)" }}
        >
          <IconShieldCheck
            size={18}
            stroke={1.5}
            aria-hidden="true"
            className="shrink-0"
            style={{ color: "var(--auth-accent)" }}
          />
          Clareza para sua equipe. Tranquilidade para seus clientes.
        </p>
      </div>

      {/* Terceira linha da grade: segura a frase no meio-baixo da coluna,
          como na referência, sem depender de altura fixa. */}
      <div aria-hidden="true" className="hidden md:block md:h-2" />
    </section>
  );
}
