"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Entrada por scroll: o elemento aparece uma vez, quando entra na tela.
 *
 * **Um observer só para a página inteira.** São umas quarenta entradas na
 * LP; um `IntersectionObserver` por componente seria quarenta observers
 * fazendo a mesma pergunta ao mesmo navegador. Este módulo mantém um
 * registro e um observer compartilhado, e cada alvo sai dele assim que
 * aparece — o custo depois da primeira dobra é zero.
 *
 * O estado escondido está no CSS (`.lp-reveal`), não aqui. Isso importa
 * porque o HTML do servidor já sai com a classe, então não há salto entre
 * a primeira pintura e a hidratação. E o `<noscript>` da página devolve
 * tudo visível para quem não executa script.
 */

const LIMIAR = 0.15;

let observador: IntersectionObserver | null = null;

/**
 * Liga um elemento ao observer compartilhado: ele ganha `is-in` quando
 * entra na tela, uma vez só.
 *
 * Exportado porque o `Reveal` não é o único interessado — a frase que se
 * preenche de verde usa o MESMO gatilho, e criar um segundo observer
 * para ela seria repetir a pergunta que este já responde.
 */
export function observar(el: Element): () => void {
  const obs = pegarObservador();
  if (!obs) {
    // Navegador sem IntersectionObserver: mostra e pronto. Nunca deixar
    // conteúdo preso num efeito que não existe ali.
    el.classList.add("is-in");
    return () => {};
  }
  obs.observe(el);
  return () => obs.unobserve(el);
}

function pegarObservador(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          entrada.target.classList.add("is-in");
          // Uma vez só: sai da lista e não volta.
          observador?.unobserve(entrada.target);
        }
      },
      { threshold: LIMIAR }
    );
  }
  return observador;
}

export function Reveal({
  children,
  className,
  /** Posição no grupo. Vira o atraso em fila. */
  ordem = 0,
  /** Tempo entre um card e o próximo. */
  passo = 60,
  /** Teto do atraso do grupo: ninguém espera o quarto card por meio segundo. */
  tetoMs = 280,
}: {
  children: ReactNode;
  className?: string;
  ordem?: number;
  passo?: number;
  tetoMs?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observar(el);
  }, []);

  const atraso = Math.min(ordem * passo, tetoMs);

  return (
    <div
      ref={ref}
      className={`lp-reveal ${className ?? ""}`}
      style={atraso ? { ["--lp-delay" as string]: `${atraso}ms` } : undefined}
    >
      {children}
    </div>
  );
}
