"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { useRef } from "react";
import type { ReactNode } from "react";

/**
 * O botão "Entrar".
 *
 * Grafite da marca — não o `--button-primary-bg` do app, que é azulado.
 * Esta tela é a única em que o brand book manda no botão.
 *
 * **O reflexo do cursor** é um `radial-gradient` posicionado por duas
 * custom properties escritas em `requestAnimationFrame`. Escrever
 * `--tf-mx` não invalida layout, só pintura: nenhum reflow por movimento
 * do mouse. Sem hover (celular), o gradiente fica em opacidade zero e o
 * `pointermove` nem chega a ser interessante.
 *
 * **Carregando** não muda largura nem altura: o texto vira "Entrando…" e
 * o spinner ocupa o lugar reservado. Botão que encolhe no meio do clique
 * é como se acerta em outra coisa sem querer. `disabled` durante o envio
 * é o que impede o duplo envio.
 */
export function AuthPrimaryButton({
  children,
  carregando = false,
  rotuloCarregando,
  disabled,
  ...rest
}: {
  children: ReactNode;
  carregando?: boolean;
  rotuloCarregando: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children">) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const pendente = useRef(0);

  function aoMover(e: React.PointerEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    if (pendente.current) return;
    pendente.current = requestAnimationFrame(() => {
      pendente.current = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--tf-mx", `${clientX - r.left}px`);
      el.style.setProperty("--tf-my", `${clientY - r.top}px`);
    });
  }

  return (
    <button
      {...rest}
      ref={ref}
      type="submit"
      onPointerMove={aoMover}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className="tf-cta inline-flex w-full items-center justify-center gap-2 rounded-sm text-[length:var(--text-small-size)] font-medium transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--auth-focus-ring)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {carregando ? (
        <IconLoader2
          size={18}
          stroke={1.75}
          aria-hidden="true"
          className="animate-spin"
        />
      ) : null}
      {carregando ? rotuloCarregando : children}
    </button>
  );
}
