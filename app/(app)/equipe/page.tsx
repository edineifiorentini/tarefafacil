import { TeamRiskReport } from "@/components/team/TeamRiskReport";

export const metadata = { title: "Equipe — TAFLOW" };

/**
 * Relatório de prazos da equipe (0082).
 *
 * O alcance é decidido no cliente por `escopoDe`, a partir do papel e dos
 * setores em que a pessoa é gestora. Não há segredo a proteger aqui: a RLS
 * já permite a qualquer membro ler as demandas do workspace, então esta
 * página organiza e avisa, não restringe.
 */
export default function EquipePage() {
  return (
    <div className="mx-auto max-w-[var(--max-width-app)] px-6 py-8">
      <div className="mb-6">
        <h2 className="text-fg text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-semibold">
          Prazos da equipe
        </h2>
        <p className="text-fg-secondary mt-1">
          Quem está com o quê atrasado, e o que ainda dá para entregar no prazo
        </p>
      </div>
      <TeamRiskReport />
    </div>
  );
}
