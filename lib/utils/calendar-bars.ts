import { parseISO } from "date-fns";

export type ProjectSegment = {
  projectId: string;
  startCol: number;
  endCol: number;
  isStart: boolean; // o início real do projeto cai nesta semana
  isEnd: boolean; // o fim real do projeto cai nesta semana
  row: number; // linha de empilhamento dentro da semana
};

type ProjectLike = {
  id: string;
  starts_on: string | null;
  ends_on: string | null;
};

// Segmentos de projeto de uma semana (7 dias), com empilhamento por linha.
// Cada projeto vira um segmento por semana → "cortado na quebra de semana".
export function weekSegments(
  week: Date[],
  projects: ProjectLike[]
): ProjectSegment[] {
  const weekStart = week[0].getTime();
  const weekEnd = week[6].getTime();

  const raw: Omit<ProjectSegment, "row">[] = [];
  for (const p of projects) {
    if (!p.starts_on || !p.ends_on) continue;
    const start = parseISO(p.starts_on).getTime();
    const end = parseISO(p.ends_on).getTime();
    if (end < weekStart || start > weekEnd) continue;

    let startCol = -1;
    let endCol = -1;
    for (let i = 0; i < 7; i++) {
      const day = week[i].getTime();
      if (day >= start && day <= end) {
        if (startCol === -1) startCol = i;
        endCol = i;
      }
    }
    if (startCol === -1) continue;

    raw.push({
      projectId: p.id,
      startCol,
      endCol,
      isStart: start >= weekStart,
      isEnd: end <= weekEnd,
    });
  }

  // Empilhamento guloso: cada segmento vai para a linha mais baixa livre.
  raw.sort((a, b) => a.startCol - b.startCol);
  const rowLastCol: number[] = [];
  const segments: ProjectSegment[] = [];
  for (const seg of raw) {
    let row = 0;
    while (row < rowLastCol.length && rowLastCol[row] >= seg.startCol) row++;
    rowLastCol[row] = seg.endCol;
    segments.push({ ...seg, row });
  }
  return segments;
}
