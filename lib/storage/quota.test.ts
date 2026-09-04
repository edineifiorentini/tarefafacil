import { describe, expect, it } from "vitest";

import {
  COTA_PADRAO_BYTES,
  TETO_POR_ARQUIVO,
  cabeNoServidor,
  diasAteSair,
  formatarEspaco,
  medirOcupacao,
  podeSairDoServidor,
  textoDoArquivoRetirado,
} from "./quota";

const MB = 1024 * 1024;
const AGORA = new Date("2026-09-04T12:00:00Z");

function diasAtras(n: number): string {
  return new Date(AGORA.getTime() - n * 86_400_000).toISOString();
}

describe("o que cabe no servidor", () => {
  it("aceita o que cabe na cota", () => {
    const r = cabeNoServidor({
      tamanhoDoArquivo: 10 * MB,
      usadoAgora: 100 * MB,
      cota: COTA_PADRAO_BYTES,
    });
    expect(r.cabe).toBe(true);
  });

  it("recusa arquivo acima do teto e manda para o Drive", () => {
    const r = cabeNoServidor({
      tamanhoDoArquivo: TETO_POR_ARQUIVO + 1,
      usadoAgora: 0,
      cota: COTA_PADRAO_BYTES,
    });
    expect(r.cabe).toBe(false);
    if (!r.cabe) {
      expect(r.motivo).toBe("arquivo_grande");
      expect(r.mensagem).toContain("Google Drive");
    }
  });

  it("recusa quando estoura a cota, mesmo com arquivo pequeno", () => {
    const r = cabeNoServidor({
      tamanhoDoArquivo: 2 * MB,
      usadoAgora: COTA_PADRAO_BYTES - MB,
      cota: COTA_PADRAO_BYTES,
    });
    expect(r.cabe).toBe(false);
    if (!r.cabe) expect(r.motivo).toBe("cota_estourada");
  });

  it("os dois motivos dão conselhos diferentes", () => {
    const grande = cabeNoServidor({
      tamanhoDoArquivo: TETO_POR_ARQUIVO + 1,
      usadoAgora: 0,
      cota: COTA_PADRAO_BYTES,
    });
    const cheio = cabeNoServidor({
      tamanhoDoArquivo: MB,
      usadoAgora: COTA_PADRAO_BYTES,
      cota: COTA_PADRAO_BYTES,
    });
    // Comprimir resolve um; apagar ou usar o Drive resolve o outro.
    expect(grande.cabe).toBe(false);
    expect(cheio.cabe).toBe(false);
    if (!grande.cabe && !cheio.cabe) {
      expect(grande.mensagem).not.toBe(cheio.mensagem);
      expect(cheio.mensagem).toContain("restam");
    }
  });

  it("o arquivo que cabe exatamente na borda entra", () => {
    const r = cabeNoServidor({
      tamanhoDoArquivo: MB,
      usadoAgora: COTA_PADRAO_BYTES - MB,
      cota: COTA_PADRAO_BYTES,
    });
    expect(r.cabe).toBe(true);
  });
});

describe("medida da ocupação", () => {
  it("avisa a partir de 80%", () => {
    expect(medirOcupacao(79 * MB, 100 * MB).perto).toBe(false);
    expect(medirOcupacao(80 * MB, 100 * MB).perto).toBe(true);
    expect(medirOcupacao(99 * MB, 100 * MB).perto).toBe(true);
  });

  it("cheio não é 'perto' — são estados diferentes", () => {
    const o = medirOcupacao(100 * MB, 100 * MB);
    expect(o.cheio).toBe(true);
    expect(o.perto).toBe(false);
  });

  it("sobrevive a cota reduzida depois dos arquivos subirem", () => {
    const o = medirOcupacao(200 * MB, 100 * MB);
    expect(o.cheio).toBe(true);
    expect(o.livre).toBe(0);
  });

  it("não divide por zero", () => {
    const o = medirOcupacao(10 * MB, 0);
    expect(Number.isFinite(o.fracao)).toBe(true);
    expect(o.cota).toBe(COTA_PADRAO_BYTES);
  });
});

describe("quando o arquivo sai do servidor", () => {
  const base = {
    storageKey: "ws/tarefa/arquivo.png",
    entregavel: true,
    criadoEm: diasAtras(60),
    aprovadoEm: null as string | null,
    jaRetiradoEm: null as string | null,
  };

  it("sai 30 dias depois de aprovado", () => {
    expect(
      podeSairDoServidor({ ...base, aprovadoEm: diasAtras(31) }, AGORA)
    ).toBe("aprovado_30d");
    expect(
      podeSairDoServidor({ ...base, aprovadoEm: diasAtras(29) }, AGORA)
    ).toBeNull();
  });

  it("sai aos 45 dias quando ninguém respondeu", () => {
    expect(
      podeSairDoServidor({ ...base, criadoEm: diasAtras(46) }, AGORA)
    ).toBe("sem_decisao_45d");
    expect(
      podeSairDoServidor({ ...base, criadoEm: diasAtras(44) }, AGORA)
    ).toBeNull();
  });

  it("aprovação manda no prazo, não a data de envio", () => {
    // Enviado há 60 dias (passaria dos 45), mas aprovado ontem: fica.
    const r = podeSairDoServidor(
      { ...base, criadoEm: diasAtras(60), aprovadoEm: diasAtras(1) },
      AGORA
    );
    expect(r).toBeNull();
  });

  it("link do Drive nunca sai", () => {
    const r = podeSairDoServidor(
      { ...base, storageKey: null, aprovadoEm: diasAtras(999) },
      AGORA
    );
    expect(r).toBeNull();
  });

  it("anexo interno nunca sai por tempo", () => {
    const r = podeSairDoServidor(
      { ...base, entregavel: false, criadoEm: diasAtras(999) },
      AGORA
    );
    expect(r).toBeNull();
  });

  it("quem já saiu não sai de novo", () => {
    const r = podeSairDoServidor(
      { ...base, criadoEm: diasAtras(999), jaRetiradoEm: diasAtras(5) },
      AGORA
    );
    expect(r).toBeNull();
  });
});

describe("aviso de prazo", () => {
  it("conta os dias que faltam depois da aprovação", () => {
    const d = diasAteSair(
      {
        storageKey: "k",
        entregavel: true,
        criadoEm: diasAtras(50),
        aprovadoEm: diasAtras(25),
        jaRetiradoEm: null,
      },
      AGORA
    );
    expect(d).toBe(5);
  });

  it("não promete prazo para o que não sai", () => {
    expect(
      diasAteSair(
        {
          storageKey: null,
          entregavel: true,
          criadoEm: diasAtras(1),
          aprovadoEm: null,
          jaRetiradoEm: null,
        },
        AGORA
      )
    ).toBeNull();
  });
});

describe("texto para o cliente", () => {
  it("diz a data e o que fazer, sem parecer erro", () => {
    const t = textoDoArquivoRetirado("2026-10-04T03:00:00Z");
    expect(t).toContain("04/10/2026");
    expect(t).toContain("Peça uma nova cópia");
  });
});

describe("formatação de espaço", () => {
  it("usa a unidade que a pessoa lê", () => {
    expect(formatarEspaco(512)).toBe("512 B");
    expect(formatarEspaco(2048)).toBe("2 KB");
    expect(formatarEspaco(5 * MB)).toBe("5 MB");
    expect(formatarEspaco(COTA_PADRAO_BYTES)).toBe("1,00 GB");
  });
});
