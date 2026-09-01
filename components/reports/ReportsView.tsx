"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { TeamRiskReport } from "@/components/team/TeamRiskReport";

import { SectorReport } from "./SectorReport";

/**
 * As duas perguntas de quem gere, lado a lado.
 *
 * "Por setor" olha para trás — o que foi produzido no período. "Equipe"
 * olha para frente — o que está prestes a estourar. São ritmos diferentes,
 * e por isso abas e não uma tela empilhada.
 */
export function ReportsView() {
  return (
    <Tabs defaultValue="setor">
      <TabsList>
        <TabsTrigger value="setor">Por setor</TabsTrigger>
        <TabsTrigger value="equipe">Prazos da equipe</TabsTrigger>
      </TabsList>

      <TabsContent value="setor">
        <SectorReport />
      </TabsContent>
      <TabsContent value="equipe">
        <TeamRiskReport />
      </TabsContent>
    </Tabs>
  );
}
