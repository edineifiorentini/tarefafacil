"use client";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

import { TextInput } from "@/components/ui/TextInput";
import { passwordIssues, passwordStrength } from "@/lib/validation/password";

import { Campo } from "./Campo";

const FORCA = ["", "fraca", "média", "forte"] as const;

/**
 * Senha, força, o que ainda falta e confirmação.
 *
 * Extraído do `SignupForm` quando as configurações precisaram do mesmo
 * conjunto. O ponto de ter um componente só não é economizar linhas: é
 * garantir que **a regra de senha das configurações seja a mesma do
 * cadastro**. Duas listas de exigências que discordam fazem a pessoa criar
 * uma senha que o cadastro recusaria — e ninguém descobre isso até alguém
 * reclamar que "aceitou aqui e não aceita lá".
 *
 * A barra nunca é verde: verde neste sistema é dado financeiro positivo
 * (CLAUDE.md). Força máxima usa a tinta do botão primário.
 */
export function PasswordFields({
  senha,
  confirmacao,
  onSenha,
  onConfirmacao,
  label = "Senha",
}: {
  senha: string;
  confirmacao: string;
  onSenha: (v: string) => void;
  onConfirmacao: (v: string) => void;
  label?: string;
}) {
  const [verSenha, setVerSenha] = useState(false);
  const faltas = passwordIssues(senha);
  const forca = passwordStrength(senha);
  const confere = !confirmacao || senha === confirmacao;

  return (
    <>
      <Campo label={label}>
        <div className="relative">
          <TextInput
            type={verSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => onSenha(e.target.value)}
            autoComplete="new-password"
            aria-label={label}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
            className="text-fg-muted hover:text-fg absolute top-1/2 right-2 -translate-y-1/2"
          >
            {verSenha ? (
              <IconEyeOff size={18} stroke={1.75} />
            ) : (
              <IconEye size={18} stroke={1.75} />
            )}
          </button>
        </div>
      </Campo>

      {senha ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="bg-line h-1 flex-1 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${
                  forca === 3
                    ? "bg-[var(--button-primary-bg)]"
                    : "bg-[var(--tone-amber)]"
                }`}
                style={{ width: `${(forca / 3) * 100}%` }}
              />
            </div>
            <span className="text-fg-muted text-[length:var(--text-caption-size)]">
              {FORCA[forca]}
            </span>
          </div>
          {faltas.length > 0 ? (
            <ul className="text-fg-muted text-[length:var(--text-caption-size)]">
              {faltas.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Campo
        label="Confirme a senha"
        erro={confere ? undefined : "As senhas não são iguais"}
      >
        <TextInput
          type={verSenha ? "text" : "password"}
          value={confirmacao}
          onChange={(e) => onConfirmacao(e.target.value)}
          autoComplete="new-password"
          aria-label="Confirmação da senha"
        />
      </Campo>
    </>
  );
}

/** A dupla está pronta para enviar: passa nas regras e as duas conferem. */
export function passwordPairOk(senha: string, confirmacao: string): boolean {
  return passwordIssues(senha).length === 0 && senha === confirmacao;
}
