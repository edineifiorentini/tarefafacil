import type { Sector } from "@/types/database";

/**
 * Ordem dos setores em LISTA DE ESCOLHA (seletores, filtros, menus).
 *
 * O banco devolve por `position`, que é a ordem que a pessoa arrastou na
 * barra lateral. Isso é ótimo para navegar — os setores mais usados no topo
 * — e ruim para escolher: num menu de doze itens, procura-se pelo nome, e
 * "por posição" parece aleatório para quem não montou a ordem.
 *
 * A barra lateral continua por `position`. Aqui é só onde se escolhe.
 *
 * `localeCompare` com pt-BR e não comparação de string crua: sem isso
 * "Órgãos" cairia depois de "Saúde", porque em UTF-16 as acentuadas vêm
 * todas depois das sem acento.
 */
export function sortSectorsByName(sectors: Sector[]): Sector[] {
  return [...sectors].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Setores já no formato do `Select`, em ordem alfabética. */
export function sectorOptions(
  sectors: Sector[]
): { value: string; label: string }[] {
  return sortSectorsByName(sectors).map((s) => ({
    value: s.id,
    label: s.name,
  }));
}

/** Ordena ids de setor pelo nome — para listas que guardam só o id. */
export function sortSectorIdsByName(
  ids: string[],
  nameOf: Map<string, string>
): string[] {
  return [...ids].sort((a, b) =>
    (nameOf.get(a) ?? "").localeCompare(nameOf.get(b) ?? "", "pt-BR")
  );
}
