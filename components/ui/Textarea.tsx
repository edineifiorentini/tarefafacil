"use client";

import { useCallback } from "react";
import type { Ref, TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autogrow?: boolean;
  error?: boolean;
  /**
   * Quem precisa do elemento — o editor de marcação mexe na seleção para
   * inserir os marcadores no lugar certo.
   *
   * Declarada porque este componente JÁ usa uma `ref` própria para o
   * autogrow: sem compor as duas, quem passasse a sua perderia o ajuste de
   * altura, ou o contrário.
   */
  ref?: Ref<HTMLTextAreaElement>;
}

function fit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function Textarea({
  autogrow = false,
  error = false,
  className,
  onInput,
  ref,
  ...rest
}: TextareaProps) {
  // Ajusta a altura inicial (conteúdo pré-preenchido) sem effect, e entrega
  // o elemento a quem pediu.
  const measure = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (el && autogrow) fit(el);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [autogrow, ref]
  );

  const handleInput: NonNullable<
    TextareaHTMLAttributes<HTMLTextAreaElement>["onInput"]
  > = (e) => {
    if (autogrow) fit(e.currentTarget);
    onInput?.(e);
  };

  return (
    <textarea
      ref={measure}
      onInput={handleInput}
      rows={autogrow ? 1 : 3}
      aria-invalid={error || undefined}
      className={`bg-card text-fg placeholder:text-fg-muted w-full rounded-sm border px-3 py-2 text-[length:var(--text-body-size)] transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60 ${
        error ? "border-overdue" : "border-line hover:border-line-strong"
      } ${autogrow ? "resize-none overflow-hidden" : "resize-y"} ${
        className ?? ""
      }`}
      {...rest}
    />
  );
}
