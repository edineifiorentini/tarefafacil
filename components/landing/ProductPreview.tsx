import {
  IconBriefcase,
  IconCalendarMonth,
  IconChartBar,
  IconChartFunnel,
  IconFileText,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLayoutList,
  IconMessages,
  IconMoneybag,
  IconSearch,
  IconSun,
  IconUsers,
} from "@tabler/icons-react";

import type { IconComponent } from "@/components/ui/types";

import { TaflowMark } from "@/components/branding/TaflowMark";
import { MOCKUP } from "@/lib/landing/conteudo";

/**
 * A interface de produto do hero.
 *
 * **É interface de verdade, não print.** O prompt pede isso e o motivo é
 * prático: uma imagem achatada fica borrada em tela retina, não
 * acompanha o tema, não redimensiona bem e não dá para corrigir um
 * texto sem reabrir o Figma. Aqui cada peça é um elemento, então o
 * mockup encolhe junto com a coluna e continua nítido.
 *
 * Os números vêm do Figma e são exemplo de interface. Nenhum deles é
 * apresentado como resultado de cliente — não há "empresas atendidas"
 * nem "faturamento gerado" nesta página, porque não existem.
 *
 * O `lp-scan-host` liga a varredura do gráfico: ela acontece UMA vez
 * quando o ponteiro entra ou algo recebe foco aqui dentro.
 */

/** Os mesmos ícones que a casca do app usa em cada item. */
const ICONES: Record<string, IconComponent> = {
  dashboard: IconLayoutDashboard,
  sol: IconSun,
  lista: IconLayoutList,
  quadro: IconLayoutKanban,
  calendario: IconCalendarMonth,
  chat: IconMessages,
  relatorio: IconChartBar,
  clientes: IconUsers,
  funil: IconChartFunnel,
  servicos: IconBriefcase,
  financeiro: IconMoneybag,
  contratos: IconFileText,
};

/** Caminho de uma série qualquer, normalizado numa caixa l×a. */
function caminho(
  pontos: readonly number[],
  l: number,
  a: number,
  teto: number
) {
  const passo = l / (pontos.length - 1);
  const p = pontos.map((v, i) => {
    const x = i * passo;
    const y = a - (v / teto) * (a - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    linha: `M ${p.join(" L ")}`,
    area: `M ${p.join(" L ")} L ${l},${a} L 0,${a} Z`,
  };
}

/** As cores das três séries do app: entregue, planejada, atrasada. */
const CORES = {
  entregue: "#0e9f76",
  planejada: "#7c3aed",
  atrasada: "#ef4444",
} as const;

export function ProductPreview() {
  return (
    // **Uma frase para o leitor de tela, e o resto escondido.**
    //
    // Sem isto a árvore de acessibilidade despeja quarenta nós:
    // "Demandas abertas, 24, seta para cima 33,3 por cento, Em
    // produção, 11..." — dados de uma empresa que não existe,
    // anunciados como se fossem informação. Numa página de vendas isso
    // é ruído, e ruído que engana.
    //
    // A primeira tentativa foi `role="img"` com `aria-label`, que pela
    // especificação torna os filhos apresentacionais. Só que a árvore
    // continuou listando tudo, e comportamento que eu não consigo
    // verificar não vai para produção. `sr-only` mais `aria-hidden`
    // funciona igual em qualquer tecnologia assistiva, e dá para provar.
    <div className="lp-scan-host relative overflow-hidden rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] shadow-[var(--taflow-elev-floating)]">
      <p className="sr-only">
        Interface do TAFLOW: painel com o menu do sistema, indicadores de
        demandas, gráfico de entregas do mês e lista de próximas entregas.
      </p>
      <div aria-hidden="true" className="flex">
        {/* Sidebar — o menu COMPLETO do sistema, com os mesmos grupos,
            ícones e atalhos de `components/shell/Sidebar.tsx`. Some
            abaixo de `sm`: doze linhas de 24px num celular espremeriam
            o conteúdo, e ali o que importa é o dashboard. */}
        <div className="hidden w-[152px] shrink-0 flex-col bg-[var(--taflow-bg-inverse)] px-2.5 py-4 sm:flex">
          <div className="mb-4 px-1.5">
            {/* A marca segue o tema por token; aqui o fundo é grafite
                sempre, então a tinta é fixada em nuvem. */}
            <TaflowMark
              title=""
              className="block"
              style={
                {
                  height: 18,
                  width: "auto",
                  ["--marca-tinta" as string]: "var(--taflow-text-inverse)",
                } as React.CSSProperties
              }
            />
          </div>

          {MOCKUP.menu.map((bloco, b) => (
            <div key={bloco.grupo ?? `g${b}`} className="mb-1.5">
              {bloco.grupo ? (
                <p className="mb-1 px-2 text-[8px] font-semibold tracking-[0.1em] text-[rgba(139,152,144,0.75)]">
                  {bloco.grupo}
                </p>
              ) : null}
              {bloco.itens.map((item) => {
                const Icone = ICONES[item.icone];
                const ativo = item.rotulo === MOCKUP.titulo;
                return (
                  <div
                    key={item.rotulo}
                    className={`relative flex h-[26px] items-center gap-2 rounded-[6px] px-2 text-[10px] font-medium ${
                      ativo
                        ? "bg-[rgba(255,255,255,0.09)] text-[var(--taflow-text-inverse)]"
                        : "text-[var(--taflow-text-secondary-inverse)]"
                    }`}
                  >
                    {ativo ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 h-3.5 w-[2px] rounded-full bg-[var(--taflow-bg-accent)]"
                      />
                    ) : null}
                    <Icone
                      size={13}
                      stroke={1.75}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    <span className="truncate">{item.rotulo}</span>
                    {"atalho" in item && item.atalho ? (
                      <span className="ml-auto text-[8px] text-[rgba(139,152,144,0.6)]">
                        {item.atalho}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--taflow-text-primary)]">
                {MOCKUP.titulo}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--taflow-text-secondary)]">
                {MOCKUP.ajuda}
              </p>
            </div>
            <div className="hidden h-9 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--taflow-border-default)] px-3 sm:flex">
              <IconSearch
                size={13}
                stroke={1.75}
                aria-hidden="true"
                className="text-[var(--taflow-text-secondary)]"
              />
              <span className="text-[11px] text-[var(--taflow-text-secondary)]">
                {MOCKUP.busca}
              </span>
            </div>
          </div>

          {/* Indicadores — os QUATRO do dashboard real, cada um com o
              seu sparkline e a comparação, como no app. */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {MOCKUP.indicadores.map((ind) => {
              const teto = Math.max(...ind.serie);
              const { linha, area } = caminho(ind.serie, 52, 22, teto);
              const cor =
                ind.sinal === "alta"
                  ? "var(--taflow-status-success)"
                  : ind.sinal === "baixa"
                    ? "var(--taflow-status-danger)"
                    : "var(--taflow-text-secondary)";
              return (
                <div
                  key={ind.nome}
                  className="rounded-[14px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] p-2.5"
                >
                  <p className="truncate text-[9px] font-medium text-[var(--taflow-text-secondary)]">
                    {ind.nome}
                  </p>
                  <p className="mt-1 text-[19px] leading-none font-semibold text-[var(--taflow-text-primary)]">
                    {ind.valor}
                  </p>
                  <div className="mt-1.5 flex items-end justify-between gap-1">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                      style={{
                        color: cor,
                        backgroundColor: `color-mix(in srgb, ${cor} 12%, transparent)`,
                      }}
                    >
                      {ind.tendencia}
                    </span>
                    {/* O sparkline do MetricCard. */}
                    <svg
                      viewBox="0 0 52 22"
                      className="h-[22px] w-[52px] shrink-0"
                      aria-hidden="true"
                    >
                      <path d={area} fill={cor} fillOpacity="0.12" />
                      <path
                        d={linha}
                        fill="none"
                        stroke={cor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>

          {/* "Entrega do mês" — as TRÊS séries do app, com legenda e
              seletor de período. */}
          <div className="lp-scan-host relative mt-3 overflow-hidden rounded-[16px] border border-[var(--taflow-border-default)] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[12px] font-semibold text-[var(--taflow-text-primary)]">
                {MOCKUP.grafico.titulo}
              </p>
              <span className="shrink-0 rounded-[8px] border border-[var(--taflow-border-default)] px-2 py-1 text-[9px] text-[var(--taflow-text-secondary)]">
                {MOCKUP.grafico.periodo} ⌄
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-end gap-2">
              <span className="text-[24px] leading-none font-semibold text-[var(--taflow-text-primary)]">
                {MOCKUP.grafico.valor}
              </span>
              <span className="pb-0.5 text-[10px] text-[var(--taflow-text-secondary)]">
                {MOCKUP.grafico.unidade}
              </span>
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                style={{
                  color: "var(--taflow-status-success)",
                  backgroundColor:
                    "color-mix(in srgb, var(--taflow-status-success) 12%, transparent)",
                }}
              >
                {MOCKUP.grafico.tendencia}
              </span>
            </div>

            {/* Legenda, com o ponto da cor de cada série. */}
            <div className="mt-2 flex flex-wrap gap-3">
              {MOCKUP.grafico.series.map((serie) => (
                <span
                  key={serie.nome}
                  className="flex items-center gap-1 text-[8px] text-[var(--taflow-text-secondary)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: CORES[serie.cor] }}
                  />
                  {serie.nome}
                </span>
              ))}
            </div>

            <svg
              viewBox="0 0 300 96"
              preserveAspectRatio="none"
              className="mt-2 block h-[92px] w-full"
              aria-hidden="true"
            >
              {[0, 0.33, 0.66, 1].map((p) => (
                <line
                  key={p}
                  x1="0"
                  x2="300"
                  y1={92 * p + 2}
                  y2={92 * p + 2}
                  stroke="var(--taflow-border-default)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {MOCKUP.grafico.series.map((serie) => {
                const teto = Math.max(
                  ...MOCKUP.grafico.series.flatMap((x) => [...x.pontos])
                );
                const { linha, area } = caminho(serie.pontos, 300, 96, teto);
                return (
                  <g key={serie.nome}>
                    <path d={area} fill={CORES[serie.cor]} fillOpacity="0.1" />
                    <path
                      d={linha}
                      fill="none"
                      stroke={CORES[serie.cor]}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="mt-1 flex justify-between text-[8px] text-[var(--taflow-text-secondary)]">
              {MOCKUP.grafico.eixoX.map((r) => (
                <span key={r}>{r}</span>
              ))}
            </div>

            <span className="lp-scanner" />
          </div>

          {/* Próximas entregas — com a etiqueta do setor e o estado,
              como no painel do app. */}
          <div className="mt-3 rounded-[14px] border border-[var(--taflow-border-default)] p-3">
            <p className="text-[11px] font-semibold text-[var(--taflow-text-primary)]">
              {MOCKUP.agenda.titulo}
            </p>
            <p className="mt-0.5 text-[9px] text-[var(--taflow-text-secondary)]">
              {MOCKUP.agenda.subtitulo}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {MOCKUP.agenda.itens.map((item) => (
                <li key={item.tarefa} className="flex items-center gap-1.5">
                  <span className="shrink-0 rounded-[6px] bg-[var(--taflow-bg-subtle)] px-1.5 py-0.5 text-[8px] font-medium text-[var(--taflow-text-secondary)]">
                    {item.hora}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[9px] text-[var(--taflow-text-primary)]">
                    {item.tarefa}
                  </span>
                  <span className="hidden shrink-0 rounded-[6px] bg-[var(--taflow-bg-accent-soft)] px-1.5 py-0.5 text-[8px] font-medium text-[var(--taflow-text-primary)] sm:inline">
                    {item.setor}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[8px] text-[var(--taflow-text-secondary)]">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          item.estado === "Pendente"
                            ? "var(--taflow-status-danger)"
                            : "var(--taflow-status-success)",
                      }}
                    />
                    {item.estado}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * O cartão flutuante de aprovação.
 *
 * No Figma ele escapa do mockup e encosta no canto inferior direito do
 * hero. Fica separado por isso: ele não é parte da interface, é um aviso
 * pousado por cima dela.
 */
export function CartaoAprovacao() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] px-4 py-3 shadow-[var(--taflow-elev-floating)]">
      <span
        aria-hidden="true"
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[var(--taflow-bg-accent)] text-[16px] font-bold text-[var(--taflow-text-primary)]"
      >
        ✓
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[var(--taflow-text-primary)]">
          {MOCKUP.aprovacao.titulo}
        </p>
        <p className="truncate text-[11px] text-[var(--taflow-text-secondary)]">
          {MOCKUP.aprovacao.meta}
        </p>
      </div>
    </div>
  );
}
