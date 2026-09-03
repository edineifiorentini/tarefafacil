"use client";

import { IconMenu2, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { TaflowMark } from "@/components/branding/TaflowMark";
import { CTAButton } from "@/components/landing/CTAButton";
import { MobileNavigation } from "@/components/landing/MobileNavigation";
import { HERO, NAV, ROTA_CADASTRO, ROTA_LOGIN } from "@/lib/landing/conteudo";

/**
 * A barra do topo.
 *
 * No Figma ela é uma cápsula de 1312×60 flutuando a 14px do topo, com
 * vidro CLARO. Aqui ela é grafite, e a troca tem uma razão medida: o
 * acid lime da ligatura "fl" da marca dá **1.09:1 sobre branco** — sobre
 * qualquer superfície clara, na verdade. Ele simplesmente desaparecia,
 * e a logo ficava com um buraco no meio.
 *
 * Acid lime só contrasta sobre escuro. Então ou a marca perdia o verde
 * no header, ou o header ficava grafite. Ficou grafite: sobre ele o lime
 * dá 15.19:1 e a nuvem 16.62:1, e a cápsula passa a conversar com o
 * painel da tela de entrar.
 *
 * Ela é `sticky`, e o vidro **só entra depois do scroll**: no topo não há
 * nada por baixo para separar, e uma borda ali seria decoração sem
 * função.
 *
 * A altura não muda entre os dois estados. Header que cresce ou encolhe
 * ao rolar empurra a página inteira e faz o texto pular embaixo do dedo.
 */

export function LandingHeader() {
  const [rolado, setRolado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // `passive` porque este listener nunca cancela o scroll — sem isso o
    // navegador precisa esperar para saber se pode rolar.
    function aoRolar() {
      setRolado(window.scrollY > 8);
    }
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header className="pointer-events-none sticky top-0 z-50 pt-3.5 pb-3.5">
      <div className="mx-auto w-full px-4 sm:px-8 xl:px-[var(--lp-header-inset)]">
        <div
          data-rolado={rolado ? "1" : "0"}
          className={`lp-header pointer-events-auto flex h-[60px] items-center gap-4 rounded-[18px] border px-4 sm:px-[22px] ${
            rolado
              ? "border-[rgba(255,255,255,0.12)] bg-[color-mix(in_srgb,var(--taflow-bg-inverse)_92%,transparent)] shadow-[var(--taflow-elev-floating)]"
              : "border-[rgba(255,255,255,0.08)] bg-[var(--taflow-bg-inverse)]"
          }`}
          style={
            {
              // A marca segue o tema por token, e aqui o fundo é grafite
              // nos dois estados: a tinta é fixada em nuvem, senão ela
              // sairia grafite sobre grafite no tema claro.
              ["--marca-tinta" as string]: "var(--taflow-text-inverse)",
            } as React.CSSProperties
          }
        >
          <Link
            href="/"
            aria-label="TAFLOW — página inicial"
            className="lp-foco-inverse flex shrink-0 items-center"
          >
            {/* Proporção oficial 855:245 preservada pelo próprio
                componente da marca; aqui só a altura é definida. */}
            <TaflowMark
              title=""
              className="block"
              style={{ height: 30, width: "auto" }}
            />
            <span className="sr-only">TAFLOW</span>
          </Link>

          <nav
            aria-label="Seções da página"
            className="ml-auto hidden items-center gap-7 lg:flex"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="lp-foco-inverse text-[14px] leading-[20px] font-medium text-[var(--taflow-text-secondary-inverse)] transition-colors [transition-duration:var(--dur-fast)] hover:text-[var(--taflow-text-inverse)]"
              >
                {item.rotulo}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-6">
            <Link
              href={ROTA_LOGIN}
              className="lp-foco-inverse hidden min-h-11 items-center px-2 text-[14px] leading-[20px] font-medium text-[var(--taflow-text-inverse)] sm:inline-flex"
            >
              Entrar
            </Link>

            {/* O `hidden` vai num INVÓLUCRO, não na classe do botão.
                O `CTAButton` já declara `inline-flex`, e duas utilidades
                de `display` no mesmo elemento são decididas pela ordem
                no CSS gerado, não pela ordem no atributo: o `inline-flex`
                vencia e o botão aparecia no celular, empurrando o header
                para 432px e criando rolagem horizontal. */}
            <div className="hidden sm:block">
              <CTAButton href={ROTA_CADASTRO} seta="diagonal">
                {HERO.ctaPrimario}
              </CTAButton>
            </div>

            <button
              ref={botaoMenu}
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-expanded={menuAberto}
              aria-controls="lp-menu"
              aria-label="Abrir menu"
              className="lp-foco-inverse grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-[rgba(255,255,255,0.16)] bg-[var(--taflow-bg-inverse-soft)] text-[var(--taflow-text-inverse)] lg:hidden"
            >
              {menuAberto ? (
                <IconX size={20} stroke={1.75} aria-hidden="true" />
              ) : (
                <IconMenu2 size={20} stroke={1.75} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      <MobileNavigation
        aberto={menuAberto}
        aoFechar={() => {
          setMenuAberto(false);
          // Devolve o foco a quem abriu: sem isso, fechar o menu joga o
          // foco para o início do documento.
          botaoMenu.current?.focus();
        }}
      />
    </header>
  );
}
