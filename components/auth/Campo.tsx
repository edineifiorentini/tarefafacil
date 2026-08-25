import type { ReactNode } from "react";

/**
 * Rótulo, campo e erro, no formato das telas de conta.
 *
 * Morava dentro do `SignupForm`. Saiu quando a tela de senha nas
 * configurações precisou do mesmo desenho — duas cópias do mesmo rótulo
 * divergem no primeiro ajuste, e aí o cadastro e as configurações passam a
 * parecer dois produtos.
 */
export function Campo({
  label,
  children,
  erro,
}: {
  label: string;
  children: ReactNode;
  erro?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
      {erro ? (
        <span className="text-overdue text-[length:var(--text-caption-size)]">
          {erro}
        </span>
      ) : null}
    </label>
  );
}
