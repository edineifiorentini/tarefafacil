"use client";

import { Checkbox } from "@/components/ui/Checkbox";

import { CELULA, GRADE } from "./grade";

/**
 * O cabeçalho de colunas.
 *
 * A tela antiga não tinha nenhum: as linhas mostravam bolinha, chip e
 * avatar sem nada dizendo o que era o quê. Quem chegava pela primeira vez
 * tinha de deduzir, e quem já usava lia por posição — até o dia em que uma
 * coluna sumia por falta de espaço e a leitura por posição passava a
 * apontar para outro dado.
 *
 * Usa a MESMA classe de grade das linhas. É o que garante o alinhamento —
 * ver `grade.ts`.
 *
 * Em modo de seleção, o controle vira "selecionar tudo o que está à vista".
 * Ele é tri-estado de propósito: com parte selecionada, uma caixa cheia
 * mentiria sobre o que um clique faria.
 */
export function TaskListHeader({
  modoSelecao,
  todasSelecionadas,
  algumaSelecionada,
  onSelecionarTodas,
}: {
  modoSelecao: boolean;
  todasSelecionadas: boolean;
  algumaSelecionada: boolean;
  onSelecionarTodas: (on: boolean) => void;
}) {
  return (
    <div
      role="row"
      className={`${GRADE} border-line text-fg-muted bg-sunken/60 border-b px-4 py-2 text-[length:var(--text-caption-size)] font-medium`}
    >
      <div className="flex items-center justify-center">
        {modoSelecao ? (
          <Checkbox
            checked={
              todasSelecionadas
                ? true
                : algumaSelecionada
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(c) => onSelecionarTodas(c === true)}
            aria-label="Selecionar todas as demandas visíveis"
          />
        ) : (
          <span className="sr-only">Concluir</span>
        )}
      </div>
      <div role="columnheader">Demanda</div>
      <div role="columnheader" className={CELULA.status}>
        Status
      </div>
      <div role="columnheader" className={`${CELULA.setor} items-center`}>
        Setor
      </div>
      <div role="columnheader" className={CELULA.responsavel}>
        Responsável
      </div>
      <div role="columnheader" className="text-right">
        Prazo
      </div>
      <div role="columnheader" className="text-right">
        <span className="sr-only">Ações</span>
      </div>
    </div>
  );
}
