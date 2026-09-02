import type { InputHTMLAttributes, ReactNode, Ref } from "react";

/**
 * Campo da porta de entrada.
 *
 * Não é o `TextInput` do app, e a diferença não é enfeite: lá o campo tem
 * 40px porque a tela é densa e cheia de linhas; aqui tem 50px porque a
 * tela tem dois campos e precisa funcionar de dedo, no celular, sem uma
 * segunda regra de alvo de toque.
 *
 * O que ele garante:
 *
 * - **rótulo sempre visível.** Nada de placeholder fazendo as vezes de
 *   rótulo: quem começa a digitar perde a referência do que era o campo;
 * - **foco que não empurra nada.** A borda troca de COR e ganha
 *   `box-shadow` — nunca de espessura. Mudar a espessura moveria o
 *   conteúdo em 1px a cada foco;
 * - **erro dito e associado.** `aria-invalid` no campo, `aria-describedby`
 *   apontando para a mensagem, e a mensagem tem um símbolo além da cor —
 *   quem não distingue vermelho continua vendo que ali deu errado.
 *
 * As cores de cada estado estão em `.tf-auth-field`, no globals.css. Aqui
 * não entra `style` de cor: estilo inline vence classe na cascata, e foi
 * assim que o foco deixou de pintar na primeira tentativa.
 */

export interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "id"> {
  id: string;
  label: string;
  /** Mensagem de erro. Presente = campo inválido. */
  erro?: string | null;
  /** Encaixe à direita, dentro do campo (o olho da senha). */
  acessorio?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function AuthField({
  id,
  label,
  erro,
  acessorio,
  className,
  ref,
  ...rest
}: AuthFieldProps) {
  const idErro = `${id}-erro`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-fg text-[length:var(--text-small-size)] font-medium"
        style={{ color: "var(--auth-panel-fg)" }}
      >
        {label}
      </label>

      {/* `tf-scan` traz o `overflow: hidden` de que a linha do scanner
          precisa; `tf-auth-field` traz altura, fundo, borda e estados. */}
      <div
        className="tf-scan tf-auth-field relative rounded-sm"
        data-erro={erro ? "" : undefined}
      >
        <input
          id={id}
          ref={ref}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className={`tf-auth-input relative z-[2] h-full w-full rounded-sm bg-transparent px-4 text-[length:var(--text-body-size)] outline-none disabled:cursor-not-allowed ${
            acessorio ? "pr-14" : ""
          } ${className ?? ""}`}
          style={{ color: "var(--auth-panel-fg)" }}
          {...rest}
        />
        {acessorio ? (
          <span className="absolute top-1/2 right-2 z-[3] -translate-y-1/2">
            {acessorio}
          </span>
        ) : null}
      </div>

      {erro ? (
        <p
          id={idErro}
          className="flex items-center gap-1.5 text-[length:var(--text-caption-size)] [animation:tf-fade-in_var(--dur-fast)_var(--ease-out)]"
          style={{ color: "var(--auth-negative)" }}
        >
          {/* Símbolo, e não só cor: daltonismo não pode esconder o erro. */}
          <span aria-hidden="true" className="font-[weight:var(--font-weight-bold)]">
            !
          </span>
          {erro}
        </p>
      ) : null}
    </div>
  );
}
