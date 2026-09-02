import { IconSearch } from "@tabler/icons-react";

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

const SERIE = [18, 26, 22, 34, 30, 46, 40, 58, 52, 68, 64, 86];

/** Constrói o caminho da linha a partir da série, em viewBox 375×118. */
function caminho(): { linha: string; area: string } {
  const largura = 375;
  const altura = 118;
  const max = Math.max(...SERIE);
  const passo = largura / (SERIE.length - 1);
  const pontos = SERIE.map((v, i) => {
    const x = i * passo;
    const y = altura - (v / max) * (altura - 14) - 7;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linha = `M ${pontos.join(" L ")}`;
  const area = `${linha} L ${largura},${altura} L 0,${altura} Z`;
  return { linha, area };
}

export function ProductPreview() {
  const { linha, area } = caminho();

  return (
    <div className="lp-scan-host relative overflow-hidden rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] shadow-[var(--taflow-elev-floating)]">
      <div className="flex">
        {/* Sidebar — grafite, com a marca em negativo. */}
        <div className="flex w-[92px] shrink-0 flex-col gap-1 bg-[var(--taflow-bg-inverse)] px-3 py-5 sm:w-[118px]">
          <div className="mb-6 px-1">
            {/* A marca segue o tema por token; aqui o fundo é grafite
                sempre, então a tinta é fixada em nuvem. */}
            <TaflowMark
              title=""
              className="block"
              style={
                {
                  height: 20,
                  width: "auto",
                  ["--marca-tinta" as string]: "var(--taflow-text-inverse)",
                } as React.CSSProperties
              }
            />
          </div>

          {MOCKUP.navegacao.map((item, i) => (
            <div
              key={item}
              className={`relative flex h-[34px] items-center rounded-[8px] px-2.5 text-[11px] font-medium ${
                i === 0
                  ? "bg-[rgba(255,255,255,0.08)] text-[var(--taflow-text-inverse)]"
                  : "text-[var(--taflow-text-secondary-inverse)]"
              }`}
            >
              {i === 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-1 h-5 w-[3px] rounded-full bg-[var(--taflow-bg-accent)]"
                />
              ) : null}
              <span className={i === 0 ? "pl-2.5" : ""}>{item}</span>
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

          {/* Indicadores — os QUATRO do dashboard real, na ordem de lá.
              O Figma desenha três; o quarto ("Taxa de conclusão")
              existe no produto e foi incluído a pedido do dono, para
              quem vem da LP reconhecer a tela ao entrar. 2×2 no
              estreito e 4 em linha a partir do `sm`, como o app faz. */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {MOCKUP.indicadores.map((ind) => (
              <div
                key={ind.nome}
                className="rounded-[14px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] p-3"
              >
                <p className="truncate text-[10px] font-medium text-[var(--taflow-text-secondary)]">
                  {ind.nome}
                </p>
                <div className="mt-1.5 flex items-end gap-1.5">
                  <span className="text-[20px] leading-none font-semibold text-[var(--taflow-text-primary)]">
                    {ind.valor}
                  </span>
                  <span
                    className="text-[9px] font-semibold"
                    style={{
                      color:
                        ind.sinal === "alta"
                          ? "var(--taflow-status-success)"
                          : "var(--taflow-status-danger)",
                    }}
                  >
                    {ind.tendencia}
                  </span>
                </div>
                <p className="mt-1 truncate text-[8px] text-[var(--taflow-text-secondary)]">
                  {MOCKUP.comparacao}
                </p>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div className="relative mt-3 overflow-hidden rounded-[16px] bg-[var(--taflow-bg-subtle)] p-4">
            <p className="text-[12px] font-semibold text-[var(--taflow-text-primary)]">
              {MOCKUP.grafico.titulo}
            </p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-[26px] leading-none font-semibold text-[var(--taflow-text-primary)]">
                {MOCKUP.grafico.valor}
              </span>
              <span className="pb-1 text-[10px] text-[var(--taflow-text-secondary)]">
                {MOCKUP.grafico.ajuda}
              </span>
            </div>

            <svg
              viewBox="0 0 375 118"
              preserveAspectRatio="none"
              className="mt-3 block h-[86px] w-full"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <linearGradient id="lp-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c7ff38" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#c7ff38" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* As quatro linhas de grade do Figma. */}
              {[0.12, 0.38, 0.64, 0.9].map((p) => (
                <line
                  key={p}
                  x1="0"
                  x2="375"
                  y1={118 * p}
                  y2={118 * p}
                  stroke="var(--taflow-border-default)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={area} fill="url(#lp-area)" />
              <path
                d={linha}
                fill="none"
                stroke="var(--taflow-text-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* A varredura do Scanner: uma passada por interação. */}
            <span className="lp-scanner" />
          </div>

          {/* Próximas entregas */}
          <div className="mt-3 rounded-[14px] border border-[var(--taflow-border-default)] p-3">
            <p className="text-[11px] font-semibold text-[var(--taflow-text-primary)]">
              {MOCKUP.agenda.titulo}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {MOCKUP.agenda.itens.map((item) => (
                <li key={item.hora} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--taflow-bg-accent)]"
                  />
                  <span className="w-9 shrink-0 text-[10px] font-medium text-[var(--taflow-text-secondary)]">
                    {item.hora}
                  </span>
                  <span className="truncate text-[10px] text-[var(--taflow-text-primary)]">
                    {item.tarefa}
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
