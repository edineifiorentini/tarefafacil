"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { observar } from "@/components/landing/Reveal";

/**
 * A frase que se preenche de verde quando entra na tela.
 *
 * Serve às frases-chave das seções escuras — as que fecham um argumento.
 * O verde varre da esquerda para a direita uma vez e para; em laço isso
 * viraria letreiro.
 *
 * **A técnica tem um risco, e ele está contido.** `background-clip:
 * text` exige `color: transparent`, e num navegador sem suporte isso
 * deixaria a frase invisível. Por isso o `color: transparent` só existe
 * dentro de um `@supports` (ver `.lp-fill` no globals.css): sem suporte,
 * a frase fica em nuvem sólida e ninguém perde nada além do efeito.
 *
 * Contraste: o verde sobre grafite dá 15.19:1 e a nuvem, 16.62:1 — a
 * frase fica legível em qualquer ponto da varrida, inclusive no meio,
 * com metade de cada cor.
 *
 * Usa o mesmo observer compartilhado do `Reveal`.
 */
export function Preenche({
  children,
  className,
  como: Tag = "span",
}: {
  children: ReactNode;
  className?: string;
  como?: "span" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observar(el);
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLSpanElement & HTMLParagraphElement>}
      className={`lp-fill ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
