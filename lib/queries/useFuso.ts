"use client";

import { createContext, createElement, useContext } from "react";
import type { ReactNode } from "react";

import { FUSO_PADRAO } from "@/lib/dates/day";

/**
 * O fuso do usuário, semeado pelo servidor.
 *
 * Mesmo formato do `WorkspaceProvider`: o layout já consulta `app_user`, o
 * fuso viaja junto na mesma consulta e a leitura no cliente é síncrona —
 * sem consulta própria, sem estado de carregamento, sem tela piscando entre
 * "não sei o fuso" e "sei".
 *
 * **A preferência salva vence o aparelho, e isso é a decisão.** Dá para
 * perguntar o fuso ao navegador a qualquer momento, e é assim que a tela de
 * configurações sugere o valor. Mas quem disse "estou em Manaus" continua
 * em Manaus ao abrir num notebook configurado errado, num computador
 * emprestado ou num aparelho que voltou de viagem. Guardar o campo só faz
 * sentido se ele mandar.
 *
 * O padrão existe para não quebrar teste nem story que renderize um
 * componente solto. Em tela de verdade o provider sempre existe.
 */
const FusoContext = createContext<string>(FUSO_PADRAO);

export function FusoProvider({
  fuso,
  children,
}: {
  fuso: string;
  children: ReactNode;
}) {
  return createElement(FusoContext.Provider, { value: fuso }, children);
}

/** Fuso do usuário — "America/Sao_Paulo", "America/Manaus"… */
export function useFuso(): string {
  return useContext(FusoContext);
}
