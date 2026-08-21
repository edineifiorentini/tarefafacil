import { describe, expect, it } from "vitest";

import type { Sector } from "@/types/database";

import {
  sectorOptions,
  sortSectorIdsByName,
  sortSectorsByName,
} from "./options";

function sector(name: string, position: number): Sector {
  return {
    id: name.toLowerCase().replace(/\s/g, "-"),
    workspace_id: "ws",
    name,
    color: "#000000",
    icon: "folder",
    position,
    archived_at: null,
  } as Sector;
}

describe("sortSectorsByName", () => {
  it("ignora a posição e ordena pelo nome", () => {
    // A ordem de entrada é a da barra lateral (position).
    const sectors = [
      sector("Prefeito e Vice", 0),
      sector("Administração", 1),
      sector("Obras", 2),
      sector("Demais Serviços", 3),
    ];
    expect(sortSectorsByName(sectors).map((s) => s.name)).toEqual([
      "Administração",
      "Demais Serviços",
      "Obras",
      "Prefeito e Vice",
    ]);
  });

  it("acento não joga o setor para o fim da lista", () => {
    // Comparando string crua, "Órgãos" e "Água" cairiam depois de "Zeladoria".
    const sectors = [
      sector("Zeladoria", 0),
      sector("Órgãos colegiados", 1),
      sector("Água e esgoto", 2),
      sector("Assistência Social", 3),
    ];
    expect(sortSectorsByName(sectors).map((s) => s.name)).toEqual([
      "Água e esgoto",
      "Assistência Social",
      "Órgãos colegiados",
      "Zeladoria",
    ]);
  });

  it("não altera o array recebido", () => {
    const sectors = [sector("Obras", 0), sector("Agricultura", 1)];
    sortSectorsByName(sectors);
    expect(sectors.map((s) => s.name)).toEqual(["Obras", "Agricultura"]);
  });
});

describe("sectorOptions", () => {
  it("devolve value/label em ordem alfabética", () => {
    const options = sectorOptions([sector("Obras", 0), sector("Educação", 1)]);
    expect(options).toEqual([
      { value: "educação", label: "Educação" },
      { value: "obras", label: "Obras" },
    ]);
  });

  it("lista vazia não quebra", () => {
    expect(sectorOptions([])).toEqual([]);
  });
});

describe("sortSectorIdsByName", () => {
  it("ordena ids pelo nome correspondente", () => {
    const nomes = new Map([
      ["a", "Saúde"],
      ["b", "Agricultura"],
      ["c", "Educação"],
    ]);
    expect(sortSectorIdsByName(["a", "b", "c"], nomes)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("id sem nome conhecido vai para o começo, sem quebrar", () => {
    const nomes = new Map([["a", "Saúde"]]);
    expect(sortSectorIdsByName(["a", "z"], nomes)).toEqual(["z", "a"]);
  });
});
