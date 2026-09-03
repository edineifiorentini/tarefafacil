// A exportação. Puro: monta o texto, não baixa nada.
//
// **Ponto e vírgula, não vírgula, e BOM na frente.** As duas coisas são a
// mesma decisão de `sector.ts`: o Excel em português abre CSV separado por
// vírgula tudo numa coluna só, e sem o BOM lê "Manutenção" como
// "ManutenÃ§Ã£o". Quem recebe o arquivo não vai reconfigurar importação —
// vai achar que o relatório está quebrado.
//
// **O cabeçalho carrega os filtros.** Uma planilha sem eles é uma tabela de
// números sem contexto, e daqui a duas semanas ninguém sabe se aquilo era o
// mês inteiro ou só um setor. É também o que separa exportar de imprimir a
// tela.

import { rotuloDoPeriodo, type Periodo } from "./periodo";

/**
 * Escapa um campo: aspas dobradas, o todo entre aspas quando precisa, e
 * decimal com VÍRGULA.
 *
 * A vírgula não é preciosismo. Este arquivo já escolheu o Excel em
 * português — ponto e vírgula como separador, BOM no começo —, e nesse
 * ambiente "1.7" não é número: a planilha lê como texto e a coluna inteira
 * para de somar. Visto no arquivo gerado em 3/set/2026, onde o tempo médio
 * saía "1.7" e "2.5".
 *
 * Só o decimal muda. Inteiro continua inteiro, para o arquivo não ganhar
 * separador de milhar que a planilha teria de desfazer.
 */
export function campoCSV(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s =
    typeof v === "number" && !Number.isInteger(v)
      ? String(v).replace(".", ",")
      : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type CabecalhoDaExportacao = {
  /** "Relatórios — Visão geral". */
  nome: string;
  periodo: Periodo;
  /** Nomes já resolvidos, não ids: a planilha é lida por gente. */
  setores: string[];
  responsaveis: string[];
  /** Quando o arquivo foi gerado. */
  geradoEm: Date;
  ordenacao?: string;
};

function dataHoraBR(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/**
 * O bloco de contexto que abre todo arquivo exportado.
 *
 * "Todos" e não vazio quando não há filtro: célula em branco num relatório
 * é ambígua — pode ser "sem filtro" ou "o filtro não foi salvo".
 */
export function cabecalhoDaExportacao(c: CabecalhoDaExportacao): string[] {
  const lista = (v: string[]) => (v.length === 0 ? "Todos" : v.join(", "));
  const linhas = [
    `Relatorio;${campoCSV(c.nome)}`,
    `Gerado em;${dataHoraBR(c.geradoEm)}`,
    `Periodo;${campoCSV(rotuloDoPeriodo(c.periodo))}`,
    `Setores;${campoCSV(lista(c.setores))}`,
    `Responsaveis;${campoCSV(lista(c.responsaveis))}`,
  ];
  if (c.ordenacao) linhas.push(`Ordenacao;${campoCSV(c.ordenacao)}`);
  linhas.push("");
  return linhas;
}

/**
 * Monta o arquivo completo: contexto, cabeçalho de colunas e linhas.
 *
 * Recebe as linhas JÁ FILTRADAS E ORDENADAS, e todas elas — não a página
 * visível. Exportar só o que está na tela é o defeito clássico de tabela
 * paginada: o arquivo sai com 20 de 137 e ninguém percebe até somar.
 */
export function montarCSV(
  cabecalho: CabecalhoDaExportacao,
  colunas: string[],
  linhas: (string | number | null)[][]
): string {
  return [
    ...cabecalhoDaExportacao(cabecalho),
    colunas.map(campoCSV).join(";"),
    ...linhas.map((l) => l.map(campoCSV).join(";")),
  ].join("\r\n");
}

/** Nome de arquivo estável e ordenável: `taflow-visao-geral-2026-08-05-a-2026-09-03.csv`. */
export function nomeDoArquivo(base: string, p: Periodo): string {
  return `taflow-${base}-${p.de}-a-${p.ate}.csv`;
}
