/**
 * Datas formatadas no fuso do BRASIL, e não no da máquina que renderiza.
 *
 * **Isto conserta um defeito que só aparece em produção**, encontrado em
 * 4/set/2026 comparando a mesma página local e no ar. `new Date(iso)` com
 * `getHours()` resolve no fuso do AMBIENTE: na minha máquina, que é
 * `America/Sao_Paulo`, dava a hora certa por acaso; na Vercel, que roda em
 * UTC, o cliente via **três horas a mais**. A página de aprovação é
 * renderizada no servidor, então quem dava a resposta era o servidor.
 *
 * O fuso fixo segue o que o projeto já assume em `lib/gcal/outbound.ts`,
 * onde `America/Sao_Paulo` é o padrão de quem não tem fuso próprio. Aqui
 * não há como fazer melhor hoje: quem abre o link não tem conta, então não
 * há preferência de fuso para consultar, e a empresa também não guarda a
 * dela. Formatar no fuso do leitor exigiria fazer isto no navegador, o que
 * traz divergência de hidratação — está no roadmap.
 *
 * `Intl` faz a conversão de verdade, inclusive horário de verão, em vez de
 * subtrair três horas na mão.
 */

const FUSO = "America/Sao_Paulo";

/** "04/09/2026 às 10:13" */
export function dataHoraBR(iso: string): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));

  const p = (t: Intl.DateTimeFormatPartTypes) =>
    partes.find((x) => x.type === t)?.value ?? "";

  return `${p("day")}/${p("month")}/${p("year")} às ${p("hour")}:${p("minute")}`;
}

/**
 * "04/09/2026" a partir de um instante (`timestamptz`).
 *
 * Vale para o que tem hora: uma decisão registrada às 22h de Brasília é 1h
 * do dia SEGUINTE em UTC, e cortar a string do ISO mostraria o dia errado.
 */
export function dataDeInstanteBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * "04/09/2026" a partir de uma data pura (coluna `date`, "2026-09-04").
 *
 * **Não passa por `Date` de propósito.** Uma coluna `date` não tem hora nem
 * fuso; `new Date("2026-09-04")` a interpreta como meia-noite UTC, e em
 * qualquer fuso a oeste ela vira o dia anterior. Um prazo mostrado um dia
 * antes numa tela de aprovação é o tipo de erro que ninguém perdoa.
 */
export function dataPuraBR(data: string): string {
  return data.slice(0, 10).split("-").reverse().join("/");
}

/**
 * "14 de outubro de 2026" a partir de uma DATA CIVIL.
 *
 * Irmã por extenso da `dataPuraBR`, e existe pelo mesmo motivo — que
 * apareceu na tela em 9/set/2026, com o mesmo dado escrito de dois jeitos:
 *
 *     resumo da assinatura   "13 de outubro de 2026"
 *     card do pagamento      "14/10/2026"
 *
 * `access_expires_at` é `timestamptz` no banco, mas o que o `settle.ts`
 * grava lá é o TEXTO de uma data civil ("2026-10-14"). O Postgres guarda
 * meia-noite UTC; `new Date(...).toLocaleDateString()` no navegador
 * brasileiro devolve 21h do dia anterior — e o acesso aparece vencendo um
 * dia antes do que vale.
 *
 * `new Date(ano, mês, dia)` é meia-noite LOCAL e a formatação também é
 * local: as duas pontas se cancelam, e nenhum fuso entra na conta.
 */
export function dataLongaPuraBR(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * "14 de outubro de 2026" a partir de um INSTANTE (`timestamptz` de verdade).
 *
 * Para o que tem hora — `trial_ends_at` é `now() + interval '7 days'`, e o
 * dia dele depende do fuso. Usar a irmã civil aqui esticaria ou encurtaria
 * o teste em um dia na virada da meia-noite.
 */
export function dataLongaDeInstanteBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
