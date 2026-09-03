import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { ReportsView } from "@/components/reports/ReportsView";

export const metadata = { title: "Relatórios — TAFLOW" };

/**
 * Central de relatórios (§26 do roadmap).
 *
 * Reúne o que antes estava espalhado. O relatório de equipe, que tinha rota
 * própria (`/equipe`), virou aba daqui: a barra lateral tem pressão de
 * espaço documentada, e trocar dois itens por um é melhor que somar.
 *
 * O `Suspense` é exigência do `useSearchParams`, que os filtros usam para
 * viver na URL — sem ele o build reclama do limite de renderização
 * estática. O fallback tem a altura do conteúdo para a página não saltar.
 */
export default function RelatoriosPage() {
  return (
    <div className="mx-auto max-w-[var(--max-width-app)] px-6 py-8">
      <div className="mb-6">
        <h2 className="text-fg text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-semibold">
          Relatórios
        </h2>
        <p className="text-fg-secondary mt-1">
          Entenda a produção, os gargalos e os riscos da operação.
        </p>
      </div>
      <Suspense fallback={<Skeleton variant="block" className="h-96" />}>
        <ReportsView />
      </Suspense>
    </div>
  );
}
