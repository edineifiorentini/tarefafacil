"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  ESTADO_PADRAO,
  estadoDaURL,
  estadoParaURL,
  type EstadoDaLista,
} from "@/lib/task/list-view";

/**
 * O estado da Lista vive na URL.
 *
 * Três coisas passam a funcionar por causa disso, e nenhuma funcionava
 * antes:
 *
 * - **o link vale como link.** "Olha as atrasadas de Obras" deixa de ser
 *   uma instrução e vira um endereço;
 * - **voltar do detalhe devolve a mesma lista.** O painel de detalhe é
 *   navegação; sem o estado no endereço, fechar a demanda jogava a pessoa
 *   de volta na visão padrão, e ela remontava o filtro na mão;
 * - **F5 não apaga o recorte.**
 *
 * `replace` e não `push`: mexer num filtro não é navegar. Com `push`, sair
 * da tela exigiria um toque no voltar para cada filtro tocado. A exceção
 * proposital é a busca, que também usa `replace` — quem digita sete letras
 * não quer sete entradas no histórico.
 *
 * **Um sentido só, e é isso que evita o laço.** A URL é a fonte; o
 * componente lê dela e escreve nela. Não há estado local espelhando o
 * endereço, então não existe o par de efeitos que se alimenta.
 */
export function useEstadoDaLista() {
  const router = useRouter();
  const params = useSearchParams();

  const estado = useMemo<EstadoDaLista>(
    () => estadoDaURL(new URLSearchParams(params.toString())),
    [params]
  );

  const alterar = useCallback(
    (mudanca: Partial<EstadoDaLista>) => {
      const proximo: EstadoDaLista = {
        ...estado,
        ...mudanca,
        filtros: { ...estado.filtros, ...(mudanca.filtros ?? {}) },
      };
      const busca = estadoParaURL(proximo);
      router.replace(busca ? `/lista?${busca}` : "/lista", { scroll: false });
    },
    [estado, router]
  );

  const limpar = useCallback(() => {
    // Volta ao padrão MENOS a busca: apagar o que a pessoa digitou sem ela
    // pedir é a forma mais rápida de fazer alguém achar que a tela travou.
    // O texto continua no campo, à vista, e some quando ela o apagar.
    const proximo: EstadoDaLista = {
      ...ESTADO_PADRAO,
      filtros: { ...ESTADO_PADRAO.filtros, q: estado.filtros.q },
    };
    const busca = estadoParaURL(proximo);
    router.replace(busca ? `/lista?${busca}` : "/lista", { scroll: false });
  }, [estado.filtros.q, router]);

  return { estado, alterar, limpar };
}
