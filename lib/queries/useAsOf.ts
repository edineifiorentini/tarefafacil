"use client";

import { useMemo, useState } from "react";

/**
 * O "agora" das leituras que dependem do tempo.
 *
 * Séries e indicadores do painel perguntam "quanto havia aberto NAQUELE
 * instante?" e comparam `completed_at <= instante`. Congelar o instante na
 * montagem (que é o que evita ler o relógio durante a renderização) fazia a
 * tela ficar cega para tudo que acontecesse depois: concluir uma demanda com
 * o painel aberto não mexia em nada até recarregar a página.
 *
 * A saída é usar o relógio do PRÓPRIO DADO. `dataUpdatedAt` do TanStack
 * Query avança a cada atualização do cache — inclusive na atualização
 * otimista da mutação —, é estável entre renderizações e diz a verdade: os
 * números valem para o momento em que os dados chegaram.
 *
 * @param dataUpdatedAt `dataUpdatedAt` da consulta que alimenta a leitura.
 */
export function useAsOf(dataUpdatedAt: number): Date {
  // Só serve para o intervalo entre montar e a primeira resposta chegar.
  // Sem ele, `new Date(0)` colocaria a tela em 1970 e tudo pareceria futuro.
  const [mountedAt] = useState(() => Date.now());
  return useMemo(
    () => new Date(dataUpdatedAt || mountedAt),
    [dataUpdatedAt, mountedAt]
  );
}
