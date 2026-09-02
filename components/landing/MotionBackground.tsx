"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A atmosfera do hero.
 *
 * **Sem canvas, e é decisão.** O Figma modela isto como duas elipses
 * suaves (`Motion / Liquid Ether / Lime` e `/ Mint`), três lascas de
 * vidro e dois assets oficiais — Flow Grid e Flow Shape Wave. Tudo isso
 * é gradiente e imagem estática; subir um canvas para redesenhar a cada
 * quadro o que o CSS pinta uma vez seria pagar caro pela mesma imagem,
 * justamente na página que precisa carregar rápido.
 *
 * Toda a composição fica na METADE DIREITA do frame (x ≥ 690 de 1440),
 * onde não há texto. É o que permite o efeito existir sem disputar
 * legibilidade com a manchete.
 *
 * O ponteiro desloca as camadas dentro do teto pedido: 12px na
 * atmosfera, 6px nas lascas. O deslocamento é `transform` puro, escrito
 * em `requestAnimationFrame` — nunca provoca reflow.
 *
 * Não faz nada em tela estreita nem com movimento reduzido: ali as
 * camadas ficam paradas, que é o que o design pede e o que a bateria
 * agradece.
 */

/** Abaixo disto o parallax não existe (e o dedo não tem hover). */
const LARGURA_MINIMA = 1024;

export function MotionBackground() {
  const raiz = useRef<HTMLDivElement | null>(null);
  const [reativo, setReativo] = useState(false);

  useEffect(() => {
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const grande = window.matchMedia(`(min-width: ${LARGURA_MINIMA}px)`);
    const fino = window.matchMedia("(hover: hover)");

    function decidir() {
      setReativo(!semMovimento.matches && grande.matches && fino.matches);
    }
    decidir();
    semMovimento.addEventListener("change", decidir);
    grande.addEventListener("change", decidir);
    return () => {
      semMovimento.removeEventListener("change", decidir);
      grande.removeEventListener("change", decidir);
    };
  }, []);

  useEffect(() => {
    const el = raiz.current;
    if (!el || !reativo) return;

    let pendente = 0;
    const secao = el.parentElement;
    if (!secao) return;

    function aoMover(e: PointerEvent) {
      if (pendente) return;
      pendente = requestAnimationFrame(() => {
        pendente = 0;
        if (!secao || !el) return;
        const r = secao.getBoundingClientRect();
        // -1 a 1 a partir do centro da seção.
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        el.style.setProperty("--lp-px", x.toFixed(3));
        el.style.setProperty("--lp-py", y.toFixed(3));
      });
    }

    function aoSair() {
      el?.style.setProperty("--lp-px", "0");
      el?.style.setProperty("--lp-py", "0");
    }

    secao.addEventListener("pointermove", aoMover, { passive: true });
    secao.addEventListener("pointerleave", aoSair, { passive: true });
    return () => {
      cancelAnimationFrame(pendente);
      secao.removeEventListener("pointermove", aoMover);
      secao.removeEventListener("pointerleave", aoSair);
    };
  }, [reativo]);

  return (
    <div
      ref={raiz}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ ["--lp-px" as string]: "0", ["--lp-py" as string]: "0" }}
    >
      {/* Liquid Ether — lime. Posição do Figma: 520×520 a partir de 58%
          da largura. O desfoque é grande, mas a caixa é pequena: blur em
          área da tela inteira é o que trava a rolagem.

          **Duas camadas de div, e não uma.** A mancha faz duas coisas ao
          mesmo tempo: ela deriva sozinha (devagar, em laço) e reage ao
          cursor. Se as duas usassem `transform`, uma sobrescreveria a
          outra. A deriva fica no `transform` do invólucro e o parallax
          no `translate` do filho — propriedades independentes, que o
          navegador compõe. */}
      <div
        className="lp-ether-a absolute"
        style={{
          left: "58%",
          top: "-6%",
          width: "min(520px, 42vw)",
          aspectRatio: "1",
        }}
      >
        <div
          className="h-full w-full rounded-full transition-[translate] duration-700 ease-out"
          style={{
            background:
              "radial-gradient(circle, rgba(199,255,56,0.5), rgba(199,255,56,0) 68%)",
            filter: "blur(28px)",
            translate: "calc(var(--lp-px) * 12px) calc(var(--lp-py) * 12px)",
          }}
        />
      </div>

      {/* Liquid Ether — mint. Deriva no sentido contrário e num período
          diferente, para as duas não andarem como um bloco só. */}
      <div
        className="lp-ether-b absolute"
        style={{
          left: "47%",
          top: "34%",
          width: "min(420px, 34vw)",
          aspectRatio: "1",
        }}
      >
        <div
          className="h-full w-full rounded-full transition-[translate] duration-700 ease-out"
          style={{
            background:
              "radial-gradient(circle, rgba(174,231,196,0.42), rgba(174,231,196,0) 70%)",
            filter: "blur(32px)",
            translate: "calc(var(--lp-px) * -9px) calc(var(--lp-py) * -9px)",
          }}
        />
      </div>

      {/* Flow Grid oficial, no canto superior direito. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- pattern
          vetorial da marca; o otimizador do Next recusa SVG. */}
      <img
        src="/marca/patterns/pattern-flow-grid.svg"
        alt=""
        width={288}
        height={216}
        className="absolute hidden opacity-70 transition-[translate] duration-700 ease-out lg:block"
        style={{
          left: "74%",
          top: "4%",
          width: "min(288px, 22vw)",
          height: "auto",
          translate: "calc(var(--lp-px) * 6px) calc(var(--lp-py) * 6px)",
        }}
      />

      {/* Flow Shape Wave oficial. Uma forma dominante por peça — é a
          regra do próprio manual da biblioteca. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/flow-shapes/flow-wave.svg"
        alt=""
        width={528}
        height={308}
        className="absolute hidden opacity-25 transition-[translate] duration-700 ease-out lg:block"
        style={{
          left: "53%",
          top: "37%",
          width: "min(528px, 38vw)",
          height: "auto",
          translate: "calc(var(--lp-px) * -6px) calc(var(--lp-py) * -6px)",
        }}
      />

      {/* Aero Shards: três lascas grandes, translúcidas, sem rotação
          contínua e sem cruzar texto. O parallax fica no teto de 6px. */}
      <svg
        viewBox="0 0 680 600"
        className="absolute hidden transition-[translate] duration-700 ease-out lg:block"
        style={{
          left: "48%",
          top: "5%",
          width: "min(680px, 48vw)",
          height: "auto",
          translate: "calc(var(--lp-px) * 6px) calc(var(--lp-py) * 6px)",
        }}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="lp-lasca" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <g fill="url(#lp-lasca)" stroke="rgba(255,255,255,0.6)" strokeWidth="1">
          <path d="M70 10 L330 58 L286 260 L96 214 Z" />
          <path d="M410 60 L650 96 L604 280 L448 244 Z" />
          <path d="M250 300 L560 336 L512 590 L292 552 Z" />
        </g>
      </svg>
    </div>
  );
}
