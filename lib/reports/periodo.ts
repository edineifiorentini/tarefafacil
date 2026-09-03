// O recorte de tempo dos relatórios: quais dias entram, com o que comparar
// e em que grão desenhar o gráfico. Puro — sem banco, sem React.
//
// **Tudo em dia civil local (`YYYY-MM-DD`), nunca em instante UTC.** É a
// mesma decisão do `lib/dates/day.ts`, e pelo mesmo motivo: `due_date` é
// data civil sem fuso, e comparar um instante com ela faz uma demanda
// entregue às 21h30 de um dia 31 cair no mês seguinte para quem está em
// UTC-3. Comparação de string funciona porque o formato é ordenável.

import { addDays, differenceInCalendarDays, parseISO } from "date-fns";

import { localDayISO } from "@/lib/dates/day";
import type { Periodo } from "./sector";

export type { Periodo };

/**
 * Os recortes que a barra de filtros oferece.
 *
 * `custom` não entra na lista de opções: ele nasce quando alguém escolhe
 * duas datas, e um item "Período personalizado" que não faz nada até ter
 * datas seria um item morto no menu.
 */
export type ChaveDePeriodo =
  | "7d"
  | "30d"
  | "90d"
  | "mes"
  | "mes_anterior"
  | "trimestre"
  | "ano"
  | "custom";

export const PERIODOS: { value: ChaveDePeriodo; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "trimestre", label: "Este trimestre" },
  { value: "ano", label: "Este ano" },
  { value: "custom", label: "Período personalizado" },
];

/** O padrão da tela. Fica aqui para a URL e o componente não discordarem. */
export const PERIODO_PADRAO: ChaveDePeriodo = "30d";

export function ehChaveDePeriodo(v: string): v is ChaveDePeriodo {
  return PERIODOS.some((p) => p.value === v);
}

/**
 * O período de uma escolha.
 *
 * "Últimos 30 dias" inclui HOJE e os 29 anteriores — trinta dias, não trinta
 * e um. A versão antiga (`sector.ts`) subtraía 30 do dia de hoje e devolvia
 * 31 dias; comparar com "os 30 anteriores" ficava desalinhado por um dia, e
 * o erro só aparece quando alguém confere a soma.
 */
export function resolverPeriodo(
  chave: ChaveDePeriodo,
  hoje: Date,
  custom?: { de: string; ate: string }
): Periodo {
  const ate = localDayISO(hoje);

  switch (chave) {
    case "7d":
      return { de: localDayISO(addDays(hoje, -6)), ate };
    case "30d":
      return { de: localDayISO(addDays(hoje, -29)), ate };
    case "90d":
      return { de: localDayISO(addDays(hoje, -89)), ate };
    case "mes":
      return {
        de: localDayISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        ate,
      };
    case "mes_anterior": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { de: localDayISO(inicio), ate: localDayISO(fim) };
    }
    case "trimestre": {
      const mes = Math.floor(hoje.getMonth() / 3) * 3;
      return {
        de: localDayISO(new Date(hoje.getFullYear(), mes, 1)),
        ate,
      };
    }
    case "ano":
      return { de: localDayISO(new Date(hoje.getFullYear(), 0, 1)), ate };
    case "custom":
      // Sem as duas pontas, cai no padrão em vez de devolver lixo. Data
      // invertida é normalizada: quem escolheu 30/09 e depois 01/09 quis um
      // intervalo, não um erro.
      if (!custom?.de || !custom?.ate) return resolverPeriodo("30d", hoje);
      return custom.de <= custom.ate
        ? { de: custom.de, ate: custom.ate }
        : { de: custom.ate, ate: custom.de };
  }
}

/** Quantos dias o período cobre, com as duas pontas incluídas. */
export function diasDoPeriodo(p: Periodo): number {
  return differenceInCalendarDays(parseISO(p.ate), parseISO(p.de)) + 1;
}

/**
 * O intervalo anterior de mesma duração, colado no início deste.
 *
 * Mesma DURAÇÃO, e não "o mês passado": um período de 30 dias compara com
 * os 30 anteriores. Fosse por mês civil, "últimos 30 dias" em março seria
 * comparado com fevereiro, que tem 28 — e a queda de 7% seria só o
 * calendário.
 */
export function periodoAnterior(p: Periodo): Periodo {
  const dias = diasDoPeriodo(p);
  const inicio = parseISO(p.de);
  return {
    de: localDayISO(addDays(inicio, -dias)),
    ate: localDayISO(addDays(inicio, -1)),
  };
}

export type Granularidade = "dia" | "semana" | "mes";

/**
 * O grão do gráfico, escolhido pelo tamanho do recorte.
 *
 * Trinta e um pontos numa linha de 640px dão 20px por ponto: ainda legível.
 * Trezentos e sessenta e cinco dão menos de 2px, e o desenho vira ruído.
 */
export function granularidadePadrao(p: Periodo): Granularidade {
  const dias = diasDoPeriodo(p);
  if (dias <= 31) return "dia";
  if (dias <= 120) return "semana";
  return "mes";
}

export type Balde = {
  /** Primeiro dia do balde — também a chave de agrupamento. */
  de: string;
  /** Último dia do balde, incluído. */
  ate: string;
  /** O que aparece no eixo: "12/09", "8–14", "set/26". */
  rotulo: string;
};

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function rotuloDoDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Os baldes do período no grão pedido.
 *
 * O primeiro e o último baldes podem ser PARCIAIS — um período que começa
 * numa quarta tem uma primeira semana de cinco dias. Recortá-los ao período
 * é o que impede o gráfico de contar demandas de fora do filtro; a
 * alternativa (arredondar para a semana cheia) faria o total do gráfico
 * divergir do total dos cartões, e é esse tipo de divergência que faz
 * alguém parar de confiar no relatório inteiro.
 */
export function baldesDo(p: Periodo, grao: Granularidade): Balde[] {
  const baldes: Balde[] = [];
  const fim = parseISO(p.ate);
  let cursor = parseISO(p.de);

  while (cursor <= fim) {
    let fimDoBalde: Date;

    if (grao === "dia") {
      fimDoBalde = cursor;
    } else if (grao === "semana") {
      fimDoBalde = addDays(cursor, 6);
    } else {
      // Último dia do mês do cursor.
      fimDoBalde = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0
      );
    }
    if (fimDoBalde > fim) fimDoBalde = fim;

    const de = localDayISO(cursor);
    const ate = localDayISO(fimDoBalde);

    baldes.push({
      de,
      ate,
      rotulo:
        grao === "dia"
          ? rotuloDoDia(de)
          : grao === "semana"
            ? de === ate
              ? rotuloDoDia(de)
              : `${de.slice(8)}–${ate.slice(8)}`
            : `${MESES[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`,
    });

    cursor =
      grao === "mes"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        : addDays(fimDoBalde, 1);
  }

  return baldes;
}

/** Rótulo humano do período, para o cabeçalho e o CSV. */
export function rotuloDoPeriodo(p: Periodo): string {
  const br = (iso: string) => iso.split("-").reverse().join("/");
  return `${br(p.de)} a ${br(p.ate)}`;
}
