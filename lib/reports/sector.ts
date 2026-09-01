// Relatório por setor. Puro: sem banco, sem React.
//
// A pergunta que ele responde é UMA: "como foi o período deste setor".
// Volume, pontualidade e tempo. Não responde "onde está travando" — isso é
// tempo por coluna, sai de `task_activity`, e misturar as duas numa tela só
// costuma produzir uma tela que não responde nenhuma.
//
// O QUE ESTE ARQUIVO SE RECUSA A FAZER, e cada recusa tem motivo:
//
// - não soma demanda sem prazo à pontualidade. Ela não é pontual nem
//   atrasada; jogá-la em qualquer um dos dois lados inventa um número;
// - não devolve zero quando nada foi entregue. "Nada entregue" e "entregue
//   no mesmo dia" são coisas diferentes, e zero confunde as duas;
// - não conta demanda cancelada como entrega nem como atraso. Ela saiu do
//   fluxo, e contá-la em qualquer coluna distorce o período.

import { localDayOf } from "@/lib/dates/day";
import type { Task } from "@/types/database";

/** Recorte de tempo, em dia local (YYYY-MM-DD), com as pontas incluídas. */
export type Periodo = { de: string; ate: string };

export type LinhaDoSetor = {
  sectorId: string;
  /** Abertas no período. */
  criadas: number;
  /** Concluídas no período. */
  entregues: number;
  /**
   * Das entregues, quantas saíram até a data combinada.
   *
   * A base é `entregues − semPrazo`: só dá para julgar pontualidade de quem
   * tinha prazo.
   */
  entreguesNoPrazo: number;
  /** Entregues no período que não tinham prazo nenhum. */
  semPrazo: number;
  /**
   * Abertas e vencidas NESTE MOMENTO — retrato, não período.
   *
   * Fica na mesma linha porque é a pergunta seguinte de quem lê o relatório
   * ("e agora, como está?"), mas a tela precisa rotulá-la como "hoje" para
   * ninguém somá-la ao resto.
   */
  atrasadasAgora: number;
  /**
   * Dias médios da criação até a conclusão, das entregues no período.
   *
   * **Da CRIAÇÃO, não da entrada em produção**, e isso é escolha: é o número
   * que o cliente vive ("pedi e recebi em X dias"). Medir só a execução
   * mede a equipe e esconde a fila — e a fila costuma ser onde o atraso
   * está. Número honesto rotulado vale mais que número lisonjeiro.
   *
   * `null` quando nada foi entregue no período.
   */
  diasMedios: number | null;
};

function dentro(diaISO: string, p: Periodo): boolean {
  // Comparação de string funciona porque o formato é YYYY-MM-DD.
  return diaISO >= p.de && diaISO <= p.ate;
}

function diasEntre(inicioISO: string, fimISO: string): number {
  const ms =
    new Date(`${fimISO}T00:00:00`).getTime() -
    new Date(`${inicioISO}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Uma linha por setor que teve movimento no período.
 *
 * Setor sem nada — nem criada, nem entregue, nem atrasada agora — não gera
 * linha: num workspace com doze setores, oito linhas zeradas escondem as
 * quatro que importam.
 */
export function relatorioPorSetor(
  tasks: Task[],
  periodo: Periodo,
  hojeISO: string
): LinhaDoSetor[] {
  const porSetor = new Map<
    string,
    LinhaDoSetor & { somaDias: number; comDias: number }
  >();

  const linha = (sectorId: string) => {
    let l = porSetor.get(sectorId);
    if (!l) {
      l = {
        sectorId,
        criadas: 0,
        entregues: 0,
        entreguesNoPrazo: 0,
        semPrazo: 0,
        atrasadasAgora: 0,
        diasMedios: null,
        somaDias: 0,
        comDias: 0,
      };
      porSetor.set(sectorId, l);
    }
    return l;
  };

  for (const t of tasks) {
    if (!t.sector_id) continue;

    const criadaEm = localDayOf(t.created_at);
    if (dentro(criadaEm, periodo)) linha(t.sector_id).criadas++;

    // Cancelada não é entrega nem atraso: saiu do fluxo.
    if (t.cancelled_at) continue;

    if (t.completed_at) {
      const entregueEm = localDayOf(t.completed_at);
      if (dentro(entregueEm, periodo)) {
        const l = linha(t.sector_id);
        l.entregues++;
        l.somaDias += diasEntre(criadaEm, entregueEm);
        l.comDias++;

        if (!t.due_date) l.semPrazo++;
        else if (entregueEm <= t.due_date) l.entreguesNoPrazo++;
      }
      continue;
    }

    // Aberta: o atraso é medido AGORA, não no período.
    if (t.due_date && t.due_date < hojeISO) linha(t.sector_id).atrasadasAgora++;
  }

  return [...porSetor.values()]
    .map((l) => ({
      sectorId: l.sectorId,
      criadas: l.criadas,
      entregues: l.entregues,
      entreguesNoPrazo: l.entreguesNoPrazo,
      semPrazo: l.semPrazo,
      atrasadasAgora: l.atrasadasAgora,
      diasMedios: l.comDias > 0 ? Math.round(l.somaDias / l.comDias) : null,
    }))
    .sort((a, b) => {
      // Quem está com mais atraso agora primeiro: é o que exige ação.
      if (b.atrasadasAgora !== a.atrasadasAgora) {
        return b.atrasadasAgora - a.atrasadasAgora;
      }
      return b.entregues - a.entregues;
    });
}

/**
 * Percentual de pontualidade, ou null quando não dá para dizer.
 *
 * A base exclui as sem prazo. Um setor que entregou 10 e tinha prazo em 2
 * está 100% pontual sobre 2, não sobre 10 — e a tela precisa mostrar a base
 * para o número não parecer melhor do que é.
 */
export function pontualidade(l: LinhaDoSetor): {
  pct: number | null;
  base: number;
} {
  const base = l.entregues - l.semPrazo;
  if (base <= 0) return { pct: null, base: 0 };
  return { pct: Math.round((l.entreguesNoPrazo / base) * 100), base };
}

/** Escapa um campo para CSV: aspas dobradas e o todo entre aspas. */
function campo(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV para levar a planilha.
 *
 * **Ponto e vírgula, não vírgula.** O Excel em português abre CSV separado
 * por vírgula tudo numa coluna só — e quem recebe o arquivo não vai
 * reconfigurar importação, vai achar que o relatório está quebrado.
 *
 * BOM no começo pelo mesmo motivo: sem ele o Excel lê "Manutenção" como
 * "ManutenÃ§Ã£o".
 */
export function paraCSV(
  linhas: LinhaDoSetor[],
  nomeDoSetor: (id: string) => string,
  periodo: Periodo
): string {
  const cabecalho = [
    "Setor",
    "Criadas",
    "Entregues",
    "No prazo",
    "Sem prazo",
    "Pontualidade %",
    "Dias medios",
    "Atrasadas hoje",
  ];

  const corpo = linhas.map((l) => {
    const p = pontualidade(l);
    return [
      campo(nomeDoSetor(l.sectorId)),
      l.criadas,
      l.entregues,
      l.entreguesNoPrazo,
      l.semPrazo,
      campo(p.pct),
      campo(l.diasMedios),
      l.atrasadasAgora,
    ].join(";");
  });

  return [
    `Periodo;${periodo.de} a ${periodo.ate}`,
    "",
    cabecalho.join(";"),
    ...corpo,
  ].join("\n");
}
