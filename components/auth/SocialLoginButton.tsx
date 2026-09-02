"use client";

import { IconLoader2 } from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * O botão de entrar por um provedor de fora (hoje só o Google).
 *
 * Mesma largura e mesmo raio do CTA, fundo claro e borda discreta: ele é
 * a alternativa, não o caminho principal, e a hierarquia se faz por peso
 * de superfície e não por tamanho.
 *
 * O componente NÃO sabe autenticar. Ele recebe `onClick` e `carregando`;
 * quem fala com o Supabase é o `AuthForm`.
 */
export function SocialLoginButton({
  icone,
  children,
  carregando = false,
  onClick,
  disabled,
}: {
  icone: ReactNode;
  children: ReactNode;
  carregando?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-sm border text-[length:var(--text-small-size)] font-medium transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--auth-focus-ring)] disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        height: "var(--auth-cta-h)",
        backgroundColor: "var(--auth-field-bg)",
        borderColor: "var(--auth-field-border)",
        color: "var(--auth-panel-fg)",
      }}
    >
      {carregando ? (
        <IconLoader2
          size={18}
          stroke={1.75}
          aria-hidden="true"
          className="animate-spin"
        />
      ) : (
        icone
      )}
      {children}
    </button>
  );
}
