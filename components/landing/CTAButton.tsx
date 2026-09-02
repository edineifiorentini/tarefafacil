"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ReactNode } from "react";

/**
 * O CTA da landing page.
 *
 * A annotation do Figma (componente `Button / CTA`, node 4:7) diz:
 * "TAFLOW CTA · primary trial and secondary navigation" — daí as duas
 * variantes serem o mesmo componente.
 *
 * **O primário é LIME, não grafite.** É diferente do botão do app e do
 * botão da tela de entrar, e é assim de propósito: o Figma pinta o CTA
 * de conversão com a cor da assinatura, e grafite sobre lime dá 15.19:1.
 * Não uniformizei com o resto do sistema porque aqui o design manda.
 *
 * O reflexo do cursor vai por custom property escrita em
 * `requestAnimationFrame`: muda pintura, não geometria, então mover o
 * mouse não provoca reflow.
 */

type Variante = "primario" | "secundario" | "inverso" | "contorno";

const VARIANTES: Record<Variante, string> = {
  // Lime com texto grafite. O CTA de conversão.
  primario:
    "bg-[var(--taflow-bg-accent)] text-[var(--taflow-text-primary)] border-[var(--taflow-bg-accent)]",
  // Superfície clara com borda — navegação secundária sobre fundo claro.
  secundario:
    "bg-[var(--taflow-bg-surface)] text-[var(--taflow-text-primary)] border-[var(--taflow-border-default)]",
  // Grafite com texto claro. É o CTA dos cards de plano.
  inverso:
    "bg-[var(--taflow-bg-inverse)] text-[var(--taflow-text-inverse)] border-[var(--taflow-bg-inverse)]",
  // Sobre superfície escura: fundo quase preto e borda translúcida.
  contorno:
    "bg-[var(--taflow-bg-inverse-soft)] text-[var(--taflow-text-inverse)] border-[var(--taflow-border-inverse)]",
};

export function CTAButton({
  href,
  children,
  variante = "primario",
  seta,
  externo = false,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variante?: Variante;
  /** Glifo à direita. O Figma usa ↗ para sair e → para seguir. */
  seta?: "diagonal" | "direita" | "nenhuma";
  externo?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const pendente = useRef(0);

  function aoMover(e: React.PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || pendente.current) return;
    const { clientX, clientY } = e;
    pendente.current = requestAnimationFrame(() => {
      pendente.current = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lp-mx", `${clientX - r.left}px`);
      el.style.setProperty("--lp-my", `${clientY - r.top}px`);
    });
  }

  const escuro = variante === "inverso" || variante === "contorno";
  const glifo = seta === "diagonal" ? "↗" : seta === "direita" ? "→" : null;

  // Link externo abre em aba nova e leva os atributos de segurança.
  const extras = externo
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      ref={ref}
      href={href}
      aria-label={ariaLabel}
      onPointerMove={aoMover}
      {...extras}
      className={`lp-cta ${escuro ? "lp-cta-inverse lp-foco-inverse" : "lp-foco"} inline-flex min-h-11 items-center justify-center gap-2.5 rounded-[14px] border px-[22px] py-3.5 text-[14px] leading-[20px] font-semibold whitespace-nowrap ${VARIANTES[variante]} ${className ?? ""}`}
    >
      {children}
      {glifo ? (
        <span aria-hidden="true" className="text-[16px] leading-none">
          {glifo}
        </span>
      ) : null}
    </Link>
  );
}
