"use client";

import { lazy, Suspense, useEffect, useState } from "react";

import { AeroShards } from "./AeroShards";
import { StaticAtmosphere } from "./StaticAtmosphere";

/**
 * Quem decide se a atmosfera animada entra.
 *
 * A regra é simples: **o formulário nunca espera pelo efeito.** A camada
 * estática é Server Component e já vem no HTML; o canvas é carregado
 * depois, num `lazy`, e só se as três condições valerem:
 *
 * 1. a pessoa não pediu movimento reduzido;
 * 2. a tela é de 768px para cima — no celular a reação ao cursor não
 *    existe e a bateria importa mais que a corrente;
 * 3. o módulo carregou. Se falhar, fica a estática e ninguém percebe.
 *
 * O componente não sabe nada de autenticação, de propósito: ele recebe um
 * lugar para pintar e pinta.
 */

const LiquidEtherCanvas = lazy(() => import("./LiquidEtherCanvas"));

/** Abaixo disto, só atmosfera estática (ver `docs/design.md`, breakpoints). */
const LARGURA_MINIMA = 768;

export function AuthBackground() {
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const grande = window.matchMedia(`(min-width: ${LARGURA_MINIMA}px)`);

    function decidir() {
      setAnimar(!semMovimento.matches && grande.matches);
    }

    decidir();
    semMovimento.addEventListener("change", decidir);
    grande.addEventListener("change", decidir);
    return () => {
      semMovimento.removeEventListener("change", decidir);
      grande.removeEventListener("change", decidir);
    };
  }, []);

  return (
    <>
      <StaticAtmosphere />
      {animar ? (
        <Suspense fallback={null}>
          <LiquidEtherCanvas />
        </Suspense>
      ) : null}
      {/* Os shards ficam ACIMA das correntes: eles são a camada de vidro
          entre a atmosfera e o texto. Somem no celular. */}
      <AeroShards className="hidden md:block" />
    </>
  );
}
