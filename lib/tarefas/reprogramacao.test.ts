import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MOTIVOS_AUTOMATICOS,
  MOTIVOS_DE_ESCOLHA,
  ROTULO_DO_MOTIVO,
  ehDataDePrazoPlausivel,
  foiReprogramada,
  rotuloDoMotivo,
  textosDaReprogramacao,
} from "./reprogramacao";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/0099_reprogramar_prazo.sql"),
  "utf8"
);

function idsDoArray(trecho: string): string[] {
  return [...trecho.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

describe("catálogo de motivos", () => {
  it("todo motivo tem rótulo, e nenhum sobra", () => {
    const todos = [...MOTIVOS_DE_ESCOLHA, ...MOTIVOS_AUTOMATICOS];
    expect(Object.keys(ROTULO_DO_MOTIVO).sort()).toEqual([...todos].sort());
  });

  /**
   * A trava do banco guarda a mesma lista escrita à mão. Um motivo novo só
   * aqui faria a reprogramação falhar para o usuário — este teste faz o
   * erro aparecer antes, para quem mudou o código.
   */
  it("a lista de motivos válidos bate com a trava do banco", () => {
    const bloco = sql.match(
      /function public\.motivo_de_prazo_valido[\s\S]*?array\[([\s\S]*?)\]::text\[\]/
    )?.[1];
    expect(bloco, "trava de motivos não encontrada na migration").toBeTruthy();
    expect(idsDoArray(bloco ?? "")).toEqual([
      ...MOTIVOS_DE_ESCOLHA,
      ...MOTIVOS_AUTOMATICOS,
    ]);
  });

  /**
   * `reprogramar_prazo` só aceita os cinco de escolha. Se aceitasse os
   * automáticos, qualquer um poderia gravar "alterado no Google" à mão e
   * esconder que foi uma reprogramação comum.
   */
  it("a função do banco só aceita os motivos de escolha", () => {
    const bloco = sql.match(
      /function public\.reprogramar_prazo[\s\S]*?array\[([\s\S]*?)\]::text\[\]/
    )?.[1];
    expect(bloco, "lista da função não encontrada").toBeTruthy();
    expect(idsDoArray(bloco ?? "")).toEqual([...MOTIVOS_DE_ESCOLHA]);
  });

  it("motivo desconhecido não quebra a tela", () => {
    expect(rotuloDoMotivo("orkut")).toBeNull();
    expect(rotuloDoMotivo(null)).toBeNull();
    expect(rotuloDoMotivo("aguardando_cliente")).toBe(
      "Aguardando retorno do cliente"
    );
  });
});

describe("foiReprogramada", () => {
  it("sem prazo original, nunca foi reprogramada", () => {
    expect(foiReprogramada({ due_date: null, prazo_original: null })).toBe(
      false
    );
  });

  it("prazo atual igual ao original não é reprogramação", () => {
    expect(
      foiReprogramada({ due_date: "2026-09-09", prazo_original: "2026-09-09" })
    ).toBe(false);
  });

  it("prazo atual diferente do original é reprogramação", () => {
    expect(
      foiReprogramada({ due_date: "2026-09-18", prazo_original: "2026-09-09" })
    ).toBe(true);
  });

  /**
   * Tirar o prazo de uma demanda que tinha um é a mudança que mais esconde
   * atraso — ela conta.
   */
  it("tirar o prazo também conta", () => {
    expect(
      foiReprogramada({ due_date: null, prazo_original: "2026-09-09" })
    ).toBe(true);
  });
});

describe("textosDaReprogramacao", () => {
  it("diz o original e o motivo, na dica e para o leitor de tela", () => {
    const t = textosDaReprogramacao("2026-09-09", "aguardando_cliente");
    expect(t.dica).toBe(
      "Prazo original: 9 set · Aguardando retorno do cliente"
    );
    expect(t.leitor).toBe(
      ", reprogramado — original 9 set, Aguardando retorno do cliente"
    );
  });

  it("sem motivo conhecido, não inventa um", () => {
    const t = textosDaReprogramacao("2026-09-09", null);
    expect(t.dica).toBe("Prazo original: 9 set");
    expect(t.leitor).toBe(", reprogramado — original 9 set");
  });
});

describe("ehDataDePrazoPlausivel", () => {
  /**
   * O que o campo de data entrega enquanto alguém digita "2026": cada passo
   * é uma data válida, e o primeiro prazo gravado vira o original para
   * sempre.
   */
  it("os passos da digitação do ano não passam", () => {
    for (const passo of ["0002-09-18", "0020-09-18", "0202-09-18"]) {
      expect(ehDataDePrazoPlausivel(passo)).toBe(false);
    }
    expect(ehDataDePrazoPlausivel("2026-09-18")).toBe(true);
  });

  it("vazio ou formato de tela não passa", () => {
    expect(ehDataDePrazoPlausivel("")).toBe(false);
    expect(ehDataDePrazoPlausivel("18/09/2026")).toBe(false);
  });
});
