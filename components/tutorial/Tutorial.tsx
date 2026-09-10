"use client";

import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { ModalFrame } from "@/components/shell/ModalFrame";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { PASSOS } from "@/lib/tutorial/conteudo";

/**
 * O guia do produto, navegável.
 *
 * **Não é um tour por cima da tela, e é uma decisão.** Um tour no primeiro
 * acesso cai num app vazio — sem demanda, sem cliente, sem material — e
 * explica "aqui você publica a versão para o cliente aprovar" para quem não
 * tem nada em que a frase grude. As pessoas aprendem a função na hora em que
 * precisam dela, e é por isso que o botão ao lado da busca importa mais que
 * a abertura automática: ele serve a quem usa há seis meses e esqueceu como
 * funciona o link do cliente.
 *
 * O que ele cobre está em `lib/tutorial/conteudo.ts`, e só o que não é
 * evidente. Cobrir cada tela criaria uma segunda fonte de verdade da
 * interface inteira — que mente no dia seguinte a qualquer mudança e
 * precisa de manutenção em compasso com o código, para sempre.
 */
export function Tutorial() {
  const { closeModal } = useShell();
  const [indice, setIndice] = useState(0);
  const passo = PASSOS[indice];
  const ultimo = indice === PASSOS.length - 1;

  return (
    <ModalFrame titulo="Como usar o TAFLOW">
      <div className="flex min-h-full flex-col gap-5 sm:min-h-[26rem] sm:flex-row sm:gap-6">
        {/* A lista some no celular: numa coluna de 375px ela empurraria o
            conteúdo para baixo da dobra, e quem abre um guia quer ler o
            guia. Ali a navegação é o rodapé. */}
        <nav
          aria-label="Assuntos do guia"
          className="hidden w-56 shrink-0 flex-col gap-0.5 sm:flex"
        >
          {PASSOS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndice(i)}
              aria-current={i === indice ? "step" : undefined}
              className={`rounded-sm px-3 py-2 text-left transition-colors [transition-duration:var(--dur-fast)] ${
                i === indice
                  ? "bg-sunken text-fg"
                  : "text-fg-secondary hover:bg-hover hover:text-fg"
              }`}
            >
              <span className="block text-[length:var(--text-small-size)] font-medium">
                {p.titulo}
              </span>
              <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                {p.resumo}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">
            <p className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
              {indice + 1} de {PASSOS.length}
            </p>
            <h3 className="text-fg mt-1 text-[length:var(--text-h2-size)] font-semibold">
              {passo.titulo}
            </h3>

            <div className="mt-3 flex flex-col gap-3">
              {passo.corpo.map((paragrafo) => (
                <p
                  key={paragrafo.slice(0, 24)}
                  className="text-fg-secondary text-[length:var(--text-body-size)]"
                >
                  {paragrafo}
                </p>
              ))}
            </div>

            {passo.destino ? (
              <Link
                href={passo.destino.href}
                onClick={closeModal}
                className="text-fg-link mt-4 inline-flex items-center gap-1.5 text-[length:var(--text-small-size)] font-medium hover:underline"
              >
                {passo.destino.rotulo}
                <IconArrowRight size={16} stroke={1.75} aria-hidden />
              </Link>
            ) : null}
          </div>

          <div className="border-line mt-6 flex items-center justify-between gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leadingIcon={IconChevronLeft}
              disabled={indice === 0}
              onClick={() => setIndice((i) => Math.max(0, i - 1))}
            >
              Anterior
            </Button>

            {ultimo ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={closeModal}
              >
                Começar a usar
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                trailingIcon={IconChevronRight}
                onClick={() =>
                  setIndice((i) => Math.min(PASSOS.length - 1, i + 1))
                }
              >
                Próximo
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
