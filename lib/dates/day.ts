import { format, parseISO } from "date-fns";

/**
 * Dia civil — e a pergunta é sempre "no fuso de quem?".
 *
 * Existe porque havia duas respostas para "que dia é hoje" no código: o
 * painel usava `toISOString().slice(0,10)` (UTC) e o sino usava `format`
 * (local). Em UTC-3 isso significa que, das 21h à meia-noite, o painel
 * achava que já era amanhã — uma demanda entregue às 21h30 caía na semana
 * seguinte do gráfico, e no dia 31 caía no mês seguinte.
 *
 * `due_date` é data civil, sem hora nem fuso: comparar com ela exige a data
 * civil de quem lê, não o instante em UTC.
 *
 * **Em 4/set/2026 o mesmo defeito voltou por outra porta.** As funções
 * `local*` respondem no fuso do AMBIENTE. No navegador isso é o fuso do
 * aparelho de quem lê, que é a resposta certa; no servidor é o fuso da
 * Vercel, que é UTC. Quando o relatório de prazos da equipe virou rota de
 * servidor, ele passou a classificar como **atrasada** a demanda que vence
 * hoje, todo dia das 21h à meia-noite — medido rodando `riscoDe` sob
 * `TZ=UTC`.
 *
 * Daí as funções `*Em`, que recebem o fuso escrito e não perguntam nada ao
 * ambiente. **Servidor usa essas.** As `local*` ficam para código que roda
 * no navegador — e mesmo lá, quando o fuso do usuário está à mão, prefira
 * as explícitas: a preferência que a pessoa salvou vale mais que a
 * configuração do aparelho em que ela abriu.
 */

/** Fuso do produto. Serve de rede quando o usuário não tem um salvo. */
export const FUSO_PADRAO = "America/Sao_Paulo";

// `en-CA` formata data como "2026-09-04" — a mesma ordem do ISO, que é o
// formato em que `due_date` é comparado. Montar por `formatToParts` seria
// mais verboso para chegar ao mesmo lugar.
const cache = new Map<string, Intl.DateTimeFormat>();

function formatador(fuso: string): Intl.DateTimeFormat {
  let f = cache.get(fuso);
  if (!f) {
    // Um `Intl.DateTimeFormat` novo por chamada é caro, e estas funções
    // rodam dentro de laços sobre listas de demandas.
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    cache.set(fuso, f);
  }
  return f;
}

/** "2026-09-04" para o instante dado, no fuso pedido. */
export function diaCivilEm(instante: Date, fuso: string): string {
  return formatador(fuso).format(instante);
}

/** Dia civil de um carimbo de tempo (`created_at`, `completed_at`…). */
export function diaCivilDeEm(carimbo: string, fuso: string): string {
  return diaCivilEm(parseISO(carimbo), fuso);
}

/** "2026-09" — mês civil de um carimbo de tempo, no fuso pedido. */
export function mesCivilDeEm(carimbo: string, fuso: string): string {
  return diaCivilDeEm(carimbo, fuso).slice(0, 7);
}

// ------------------------------------------------- fuso do ambiente
// Mantidas para o código que roda no navegador, onde "o ambiente" é o
// aparelho de quem lê. Em servidor, o ambiente é UTC — use as `*Em`.

/** "2026-08-18" para o instante dado, no fuso do ambiente. */
export function localDayISO(instant: Date): string {
  return format(instant, "yyyy-MM-dd");
}

/** Dia civil local de um carimbo de tempo (`created_at`, `completed_at`…). */
export function localDayOf(timestampISO: string): string {
  return localDayISO(parseISO(timestampISO));
}

/** "2026-08" — mês civil local de um carimbo de tempo. */
export function localMonthOf(timestampISO: string): string {
  return format(parseISO(timestampISO), "yyyy-MM");
}
