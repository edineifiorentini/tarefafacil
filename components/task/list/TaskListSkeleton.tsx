import { Skeleton } from "@/components/ui/Skeleton";

import { CELULA, GRADE } from "./grade";

/**
 * O esqueleto usa a MESMA grade das linhas de verdade.
 *
 * É o que impede o salto: quando os dados chegam, cada coluna já está na
 * largura em que vai ficar, e quem começou a ler o primeiro título não
 * perde o lugar. Um esqueleto de blocos genéricos economiza dez linhas de
 * código e devolve exatamente o defeito que ele deveria evitar.
 */
const LARGURAS = ["w-3/5", "w-4/5", "w-2/5", "w-3/4", "w-1/2", "w-2/3"];

export function TaskListSkeleton({ linhas = 6 }: { linhas?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          className={`${GRADE} border-line min-h-[4.25rem] border-b px-4 py-3 last:border-b-0`}
        >
          <div className="flex justify-center">
            <Skeleton variant="block" className="h-4 w-4 rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Larguras diferentes por linha: um esqueleto de barras
                idênticas parece uma tabela carregada de dados iguais. */}
            <Skeleton className={`h-3.5 ${LARGURAS[i % LARGURAS.length]}`} />
          </div>
          <div className={CELULA.status}>
            <Skeleton variant="block" className="h-5 w-20 rounded-full" />
          </div>
          <div className={`${CELULA.setor} items-center`}>
            <Skeleton variant="block" className="h-3.5 w-24" />
          </div>
          <div className={CELULA.responsavel}>
            <Skeleton variant="block" className="h-6 w-6 rounded-full" />
          </div>
          <div className="flex justify-end">
            <Skeleton variant="block" className="h-5 w-16 rounded-full" />
          </div>
          <div />
        </div>
      ))}
    </div>
  );
}
