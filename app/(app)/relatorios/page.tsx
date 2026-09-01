import { ReportsView } from "@/components/reports/ReportsView";

export const metadata = { title: "Relatórios — TAFLOW" };

/**
 * Central de relatórios (§26 do roadmap).
 *
 * Reúne o que antes estava espalhado. O relatório de equipe, que tinha rota
 * própria (`/equipe`), virou aba daqui: a barra lateral tem pressão de
 * espaço documentada, e trocar dois itens por um é melhor que somar.
 */
export default function RelatoriosPage() {
  return (
    <div className="mx-auto max-w-[var(--max-width-app)] px-6 py-8">
      <div className="mb-6">
        <h2 className="text-fg text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-semibold">
          Relatórios
        </h2>
        <p className="text-fg-secondary mt-1">
          O que os setores produziram, e onde os prazos estão em risco
        </p>
      </div>
      <ReportsView />
    </div>
  );
}
