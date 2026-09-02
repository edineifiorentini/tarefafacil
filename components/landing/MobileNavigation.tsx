"use client";

import { IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { CTAButton } from "@/components/landing/CTAButton";
import { HERO, NAV, ROTA_CADASTRO, ROTA_LOGIN } from "@/lib/landing/conteudo";

/**
 * O menu de navegação abaixo de `lg`.
 *
 * É um painel próprio, e não a mesma barra encolhida: o Figma desenha o
 * desktop, e espremer sete links numa faixa de 375px daria alvos de
 * toque de 20px.
 *
 * O que ele precisa fazer para ser navegável sem mouse, e faz:
 *
 * - **prende o foco dentro dele** enquanto está aberto. Sem isso o Tab
 *   passeia pela página atrás do painel, e quem usa teclado se perde;
 * - **fecha no Escape** e ao escolher um link;
 * - **devolve o foco ao botão que o abriu** (quem cuida disso é o
 *   `LandingHeader`, que tem a referência);
 * - **trava a rolagem do fundo**, compensando a barra de rolagem para a
 *   página não dar um salto lateral ao abrir.
 */

export function MobileNavigation({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  const painel = useRef<HTMLDivElement | null>(null);
  const primeiro = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    const anteriorPad = document.body.style.paddingRight;
    // A largura da barra de rolagem vira padding: sem isso o conteúdo
    // desliza para a direita no instante em que o menu abre.
    const barra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;

    primeiro.current?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        aoFechar();
        return;
      }
      if (e.key !== "Tab") return;

      const alvos = painel.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])"
      );
      if (!alvos || alvos.length === 0) return;
      const inicio = alvos[0];
      const fim = alvos[alvos.length - 1];

      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault();
        fim.focus();
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault();
        inicio.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
      document.body.style.paddingRight = anteriorPad;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 lg:hidden">
      {/* Fundo. É `button` e não `div` para quem usa teclado também
          conseguir fechar por aqui, e some do leitor de tela porque o
          Escape e o X já dizem a mesma coisa. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={aoFechar}
        className="absolute inset-0 bg-[rgba(23,23,23,0.45)]"
      />

      <div
        ref={painel}
        id="lp-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-x-0 top-0 flex max-h-dvh flex-col overflow-y-auto rounded-b-[24px] bg-[var(--taflow-bg-surface)] px-6 pt-5 pb-8 shadow-[var(--taflow-elev-floating)]"
      >
        <div className="flex items-center justify-end">
          <button
            ref={primeiro}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            className="lp-foco grid h-11 w-11 place-items-center rounded-[12px] border border-[var(--taflow-border-default)] text-[var(--taflow-text-primary)]"
          >
            <IconX size={20} stroke={1.75} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Seções da página" className="mt-2 flex flex-col">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={aoFechar}
              className="lp-foco flex min-h-[52px] items-center border-b border-[var(--taflow-border-default)] text-[17px] font-medium text-[var(--taflow-text-primary)]"
            >
              {item.rotulo}
            </a>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-3">
          <CTAButton href={ROTA_CADASTRO} seta="diagonal" className="w-full">
            {HERO.ctaPrimario}
          </CTAButton>
          <Link
            href={ROTA_LOGIN}
            onClick={aoFechar}
            className="lp-foco inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[var(--taflow-border-default)] px-[22px] py-3.5 text-[14px] font-semibold text-[var(--taflow-text-primary)]"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
