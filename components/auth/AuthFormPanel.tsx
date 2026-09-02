import type { ReactNode } from "react";

import { FlowDivider } from "./FlowDivider";

/**
 * O painel do formulário.
 *
 * Superfície sólida, e é o ponto: legibilidade vem antes do efeito, e
 * quem está aqui quer entrar, não admirar. O único vidro da tela está do
 * outro lado. O formulário também não é um cartão flutuando no meio —
 * ele é uma coluna dentro do painel, como na referência; cartão sobre
 * painel daria duas molduras concorrentes.
 *
 * Server Component. A costura verde entra por aqui porque ela pertence à
 * BORDA deste painel: é o formulário que avança sobre o grafite.
 */
export function AuthFormPanel({ children }: { children: ReactNode }) {
  return (
    <section
      className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12"
      style={{ backgroundColor: "var(--auth-panel-bg)" }}
    >
      {/* Costura vertical: fica à ESQUERDA deste painel (`right-full`),
          avançando sobre o grafite. Só existe quando há dois painéis. */}
      <FlowDivider
        className="pointer-events-none absolute top-0 right-full hidden h-full md:block"
        style={{ width: "var(--auth-seam-w)" }}
      />

      {/* Costura horizontal: no celular os painéis empilham e a curva
          separa o topo grafite do formulário. */}
      <FlowDivider
        orientacao="horizontal"
        className="pointer-events-none absolute bottom-full left-0 h-10 w-full md:hidden"
      />

      <div
        className="mx-auto w-full"
        style={{ maxWidth: "var(--auth-form-w)" }}
      >
        {children}
      </div>
    </section>
  );
}
