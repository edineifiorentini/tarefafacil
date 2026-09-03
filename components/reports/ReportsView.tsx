"use client";

import { useMemo } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { TeamRiskReport } from "@/components/team/TeamRiskReport";

import { OverviewReport } from "./OverviewReport";
import { SectorReport } from "./SectorReport";
import { useReportFilters } from "./useReportFilters";

/**
 * As três perguntas de quem gere, em ordem de urgência.
 *
 * **"Visão geral" é a entrada**, e essa é a mudança de fundo desta tela. A
 * versão anterior abria numa tabela por setor: ela responde "quais são os
 * números", que é a segunda pergunta. A primeira é "está tudo bem?", e uma
 * tabela nunca respondeu isso de relance.
 *
 * As outras duas continuam inteiras. "Por setor" olha para trás — o que foi
 * produzido no período. "Prazos e equipe" olha para frente — o que está
 * prestes a estourar. São ritmos diferentes, e por isso abas e não uma tela
 * empilhada.
 *
 * Os filtros são de todas. Ficam AQUI, e não dentro de cada aba, porque
 * senão trocar de aba jogaria fora o recorte que a pessoa acabou de montar
 * — e ninguém remonta um filtro duas vezes para conferir a mesma coisa.
 */
export function ReportsView() {
  // Uma referência de "agora" para a tela inteira. Chamar `new Date()` em
  // cada cálculo faria o período mudar no meio de uma renderização, e à
  // meia-noite os cartões e a tabela discordariam sobre que dia é hoje. O
  // relatório é um retrato do instante em que foi aberto.
  const agora = useMemo(() => new Date(), []);
  const { filtros, alterar, limpar, temFiltro } = useReportFilters(agora);

  return (
    <Tabs value={filtros.aba} onValueChange={(aba) => alterar({ aba })}>
      <TabsList>
        <TabsTrigger value="geral">Visão geral</TabsTrigger>
        <TabsTrigger value="setor">Por setor</TabsTrigger>
        <TabsTrigger value="equipe">Prazos e equipe</TabsTrigger>
      </TabsList>

      <TabsContent value="geral">
        <OverviewReport
          filtros={filtros}
          alterar={alterar}
          limpar={limpar}
          temFiltro={temFiltro}
          agora={agora}
        />
      </TabsContent>

      <TabsContent value="setor">
        <SectorReport filtros={filtros} alterar={alterar} agora={agora} />
      </TabsContent>

      <TabsContent value="equipe">
        <TeamRiskReport filtros={filtros} alterar={alterar} agora={agora} />
      </TabsContent>
    </Tabs>
  );
}
