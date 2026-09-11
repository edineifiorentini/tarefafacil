import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { quickAddSchema } from "@/lib/validation/task";

import {
  DESTINO_IDS,
  DESTINOS,
  DESTINOS_FREQUENTES,
  GRUPOS_DE_OUTROS,
  MARCAS_DE_REDE,
  ehDestino,
  ordenarDestinos,
} from "./destinos";

describe("catálogo de destinos", () => {
  it("cada destino tem id próprio, e a lista segue a ordem dos ids", () => {
    expect(new Set(DESTINO_IDS).size).toBe(DESTINO_IDS.length);
    expect(DESTINOS.map((d) => d.id)).toEqual([...DESTINO_IDS]);
  });

  it("os seis mais usados ficam à vista, na ordem aprovada", () => {
    expect(DESTINOS_FREQUENTES.map((d) => d.nome)).toEqual([
      "Instagram",
      "Facebook",
      "TikTok",
      "YouTube",
      "WhatsApp",
      "Site",
    ]);
  });

  it("o resto fica em Outros, agrupado, sem perder nenhum destino", () => {
    const emOutros = GRUPOS_DE_OUTROS.flatMap((g) =>
      g.destinos.map((d) => d.id)
    );
    expect(emOutros).toHaveLength(
      DESTINO_IDS.length - DESTINOS_FREQUENTES.length
    );
    expect(GRUPOS_DE_OUTROS.map((g) => g.grupo)).toEqual([
      "Redes sociais",
      "Mensagens",
      "Mídia tradicional",
      "Imprensa",
    ]);
  });

  it("toda marca com logo é um destino do catálogo", () => {
    for (const marca of MARCAS_DE_REDE) expect(ehDestino(marca)).toBe(true);
  });

  /**
   * A trava do banco (0098) guarda a mesma lista escrita à mão. Se alguém
   * acrescentar um destino só aqui, a demanda com ele não grava — e o erro
   * aparece para o usuário, não para quem mudou o código. Este teste faz
   * aparecer antes.
   */
  it("a lista bate com a trava do banco", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/0098_destinos_da_tarefa.sql"),
      "utf8"
    );
    const bloco = sql.match(/array\[([\s\S]*?)\]::text\[\]/)?.[1];
    expect(bloco, "array de destinos não encontrado na migration").toBeTruthy();
    const noBanco = [...(bloco ?? "").matchAll(/'([a-z_]+)'/g)].map(
      (m) => m[1]
    );
    expect(noBanco).toEqual([...DESTINO_IDS]);
  });
});

describe("ordenarDestinos", () => {
  it("devolve na ordem do catálogo, não na ordem dos cliques", () => {
    expect(ordenarDestinos(["site", "instagram", "radio"])).toEqual([
      "instagram",
      "site",
      "radio",
    ]);
  });

  it("não repete", () => {
    expect(ordenarDestinos(["tiktok", "tiktok"])).toEqual(["tiktok"]);
  });

  /**
   * Destino que saiu do catálogo não pode quebrar a demanda antiga: ela
   * continua abrindo, só sem a logo que não existe mais.
   */
  it("descarta id desconhecido em silêncio", () => {
    expect(ordenarDestinos(["orkut", "facebook"])).toEqual(["facebook"]);
  });

  it("sem destino é lista vazia", () => {
    expect(ordenarDestinos([])).toEqual([]);
  });
});

describe("validação da criação", () => {
  const base = {
    title: "Convite para a audiência pública",
    sector_id: "0e8b6d0e-2c2a-4a8f-9d4e-2a1d4b3c5e6f",
  };

  it("aceita destinos do catálogo", () => {
    expect(
      quickAddSchema.safeParse({ ...base, destinos: ["instagram", "radio"] })
        .success
    ).toBe(true);
  });

  it("recusa destino fora do catálogo antes de chegar ao banco", () => {
    expect(
      quickAddSchema.safeParse({ ...base, destinos: ["orkut"] }).success
    ).toBe(false);
  });

  it("destino é opcional — tarefa sem destino continua valendo", () => {
    expect(quickAddSchema.safeParse(base).success).toBe(true);
    expect(quickAddSchema.safeParse({ ...base, destinos: [] }).success).toBe(
      true
    );
  });
});
