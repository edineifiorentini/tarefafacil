"use client";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

import { AuthField, type AuthFieldProps } from "./AuthField";

/**
 * O campo de senha, com o olho.
 *
 * O botão é `type="button"` — dentro de um `<form>`, botão sem tipo é
 * submit, e mostrar a senha enviaria o formulário.
 *
 * O `aria-label` diz a AÇÃO ("Mostrar senha"), não o estado. Quem usa
 * leitor de tela ouve o que vai acontecer se apertar, que é o que serve
 * para decidir. `aria-pressed` conta o estado, para quem quiser.
 */
export function PasswordField(
  props: Omit<AuthFieldProps, "type" | "acessorio">
) {
  const [visivel, setVisivel] = useState(false);

  return (
    <AuthField
      {...props}
      type={visivel ? "text" : "password"}
      acessorio={
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="grid h-11 w-11 place-items-center rounded-sm transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--auth-focus-ring)]"
          style={{ color: "var(--auth-panel-fg-secondary)" }}
        >
          {/* Os dois ícones ficam montados e trocam por opacidade: assim a
              troca é uma transição e não um salto de layout. */}
          <span className="relative grid place-items-center">
            <IconEye
              size={18}
              stroke={1.5}
              aria-hidden="true"
              className="col-start-1 row-start-1 transition-opacity [transition-duration:var(--dur-fast)]"
              style={{ opacity: visivel ? 0 : 1 }}
            />
            <IconEyeOff
              size={18}
              stroke={1.5}
              aria-hidden="true"
              className="col-start-1 row-start-1 transition-opacity [transition-duration:var(--dur-fast)]"
              style={{ opacity: visivel ? 1 : 0 }}
            />
          </span>
        </button>
      }
    />
  );
}
