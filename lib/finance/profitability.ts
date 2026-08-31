// Rentabilidade por cliente ou projeto (0081). Puro: sem banco, sem React.
//
// A decisão que dá forma a este arquivo: **o resultado carrega junto o que
// ele NÃO sabe.** `minutosSemPreco`, `previstoEntradaCents` e
// `temPrecoDeHora` não são enfeite — são o que permite a tela dizer "12h não
// entraram no custo" em vez de mostrar uma margem que parece completa e não
// é. Número de rentabilidade que esconde a própria lacuna mente para quem
// confia nele, e quem confia nele decide preço.

/** Um lançamento financeiro, reduzido ao que importa para a conta. */
export type Lancamento = {
  kind: "entrada" | "saida";
  status: "previsto" | "confirmado" | "cancelado";
  amountCents: number;
};

/** Por qual eixo agrupar a rentabilidade. */
export type Recorte = "cliente" | "projeto" | "setor";

/** As três etiquetas que um lançamento ou uma hora pode carregar. */
export type Classificacao = {
  clientId: string | null;
  projectId: string | null;
  sectorId: string | null;
};

/** Chave do recorte, ou null quando o item não tem aquela etiqueta. */
export function chaveDoRecorte(
  c: Classificacao,
  recorte: Recorte
): string | null {
  if (recorte === "cliente") return c.clientId;
  if (recorte === "projeto") return c.projectId;
  return c.sectorId;
}

/** Horas apontadas por uma pessoa. Vem de `task_time_entry`. */
export type Apontamento = {
  userId: string;
  minutos: number;
};

/**
 * Preço da hora. `userId` nulo é o padrão da empresa (0081).
 */
export type Preco = {
  userId: string | null;
  horaCents: number;
};

export type CustoDeHoras = {
  cents: number;
  /** Minutos de gente sem preço — nem próprio, nem padrão da empresa. */
  minutosSemPreco: number;
};

export type Rentabilidade = {
  receitaCents: number;
  custoDiretoCents: number;
  custoDeHorasCents: number;
  /** receita − custo direto − custo de horas. Pode ser negativa. */
  margemCents: number;

  // ---- o que o número NÃO contém, para a tela poder dizer -------------
  /** Horas apontadas que ficaram de fora por não ter preço. */
  minutosSemPreco: number;
  /** Há algum preço cadastrado? Falso = a margem ignora o trabalho. */
  temPrecoDeHora: boolean;
  /** Ainda não confirmado, fora da conta acima. */
  previstoEntradaCents: number;
  previstoSaidaCents: number;
};

/**
 * Preço de uma pessoa: o dela, senão o padrão da empresa, senão nada.
 *
 * Devolver `null` em vez de zero é deliberado. Zero seria "esta hora não
 * custa nada", que entra silenciosamente na margem e a infla. `null` é
 * "não sei quanto custa", e vira `minutosSemPreco`.
 */
export function precoDe(userId: string, precos: Preco[]): number | null {
  const proprio = precos.find((p) => p.userId === userId);
  if (proprio) return proprio.horaCents;

  const padrao = precos.find((p) => p.userId === null);
  return padrao ? padrao.horaCents : null;
}

/**
 * Custo do trabalho apontado.
 *
 * A conta é feita em minutos e só divide no fim: somar `hora/60` a cada
 * apontamento acumula erro de arredondamento, e num mês de apontamentos
 * isso vira alguns reais que ninguém consegue explicar.
 */
export function custoDeHoras(
  apontamentos: Apontamento[],
  precos: Preco[]
): CustoDeHoras {
  let centsPorMinuto = 0;
  let minutosSemPreco = 0;

  for (const a of apontamentos) {
    const hora = precoDe(a.userId, precos);
    if (hora === null) {
      minutosSemPreco += a.minutos;
      continue;
    }
    centsPorMinuto += hora * a.minutos;
  }

  return { cents: Math.round(centsPorMinuto / 60), minutosSemPreco };
}

/**
 * Rentabilidade de um recorte — um cliente, um projeto, um setor.
 *
 * **Só `confirmado` entra na margem.** Previsto é intenção: contar uma
 * entrada que ainda não caiu como lucro é o jeito clássico de uma empresa
 * se achar saudável até a semana em que o dinheiro não chega. O previsto
 * volta separado, para a tela mostrar sem misturar.
 *
 * `cancelado` não aparece em lugar nenhum — não é previsto nem realizado.
 */
export function rentabilidade(
  lancamentos: Lancamento[],
  apontamentos: Apontamento[],
  precos: Preco[]
): Rentabilidade {
  let receitaCents = 0;
  let custoDiretoCents = 0;
  let previstoEntradaCents = 0;
  let previstoSaidaCents = 0;

  for (const l of lancamentos) {
    if (l.status === "cancelado") continue;

    if (l.status === "confirmado") {
      if (l.kind === "entrada") receitaCents += l.amountCents;
      else custoDiretoCents += l.amountCents;
      continue;
    }

    if (l.kind === "entrada") previstoEntradaCents += l.amountCents;
    else previstoSaidaCents += l.amountCents;
  }

  const horas = custoDeHoras(apontamentos, precos);

  return {
    receitaCents,
    custoDiretoCents,
    custoDeHorasCents: horas.cents,
    margemCents: receitaCents - custoDiretoCents - horas.cents,
    minutosSemPreco: horas.minutosSemPreco,
    temPrecoDeHora: precos.length > 0,
    previstoEntradaCents,
    previstoSaidaCents,
  };
}

/**
 * Rentabilidade agrupada por um recorte.
 *
 * **O balde `null` existe e é obrigatório.** Lançamento sem projeto e hora
 * sem cliente não podem sumir da soma — se sumissem, a tela mostraria uma
 * receita menor que a real e ninguém entenderia por quê. Eles aparecem
 * juntos, sob a chave nula, e a tela os rotula ("Sem projeto").
 *
 * A ordem é por margem decrescente: quem está dando prejuízo aparece no
 * fim, que é onde se olha depois de ver quem está dando lucro.
 */
export function agrupar(
  lancamentos: (Lancamento & Classificacao)[],
  apontamentos: (Apontamento & Classificacao)[],
  precos: Preco[],
  recorte: Recorte
): { chave: string | null; resultado: Rentabilidade }[] {
  const baldes = new Map<
    string,
    {
      chave: string | null;
      lancamentos: Lancamento[];
      apontamentos: Apontamento[];
    }
  >();

  // Map com chave de string porque `null` precisa de um balde estável, e
  // `Map<string | null>` funcionaria mas embaralha a ordenação depois.
  const balde = (chave: string | null) => {
    const k = chave ?? "\u0000sem";
    let b = baldes.get(k);
    if (!b) {
      b = { chave, lancamentos: [], apontamentos: [] };
      baldes.set(k, b);
    }
    return b;
  };

  for (const l of lancamentos) balde(chaveDoRecorte(l, recorte)).lancamentos.push(l);
  for (const a of apontamentos) balde(chaveDoRecorte(a, recorte)).apontamentos.push(a);

  return [...baldes.values()]
    .map((b) => ({
      chave: b.chave,
      resultado: rentabilidade(b.lancamentos, b.apontamentos, precos),
    }))
    .sort((x, y) => y.resultado.margemCents - x.resultado.margemCents);
}
