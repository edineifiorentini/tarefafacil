"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";

import {
  closedAreaPath,
  makeXScale,
  makeYScale,
  niceTicks,
  polylineLength,
  smoothLinePath,
  type Point,
} from "@/lib/charts/path";
import type { PontoDeFluxo } from "@/lib/reports/overview";

/**
 * Entrou versus saiu, ao longo do período.
 *
 * **Duas séries, não uma de "pendentes".** O acúmulo é consequência;
 * mostrar a causa — entrada contra saída — é o que deixa agir. Quando as
 * linhas se afastam, a fila está crescendo, e dá para ver em qual semana
 * começou.
 *
 * Desenhado à mão em SVG, como os outros gráficos do produto
 * (`CashFlowChart`, `Sparkline`), sobre as mesmas funções de geometria de
 * `lib/charts/path.ts`. Sem biblioteca: o projeto não tem nenhuma, e
 * trazer uma para desenhar duas linhas somaria centenas de kilobytes ao
 * pacote e uma segunda gramática de gráfico ao código.
 */

const W = 720;
const H = 240;
const PAD_ESQ = 30;
const PAD_DIR = 10;
const PAD_TOPO = 12;
const PAD_BASE = 26;

export function DemandFlowChart({
  pontos,
  grao,
  onGrao,
  onSelecionarIntervalo,
}: {
  pontos: PontoDeFluxo[];
  grao: "dia" | "semana" | "mes";
  onGrao: (g: "semana" | "mes") => void;
  /** Clique num ponto: leva à lista daquele intervalo. */
  onSelecionarIntervalo?: (p: PontoDeFluxo) => void;
}) {
  const idCriadas = useId();
  const idEntregues = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (pontos.length === 0) {
    return (
      <p className="text-fg-secondary py-8 text-center text-[length:var(--text-small-size)]">
        Nenhuma demanda criada ou entregue neste período.
      </p>
    );
  }

  const usavelW = W - PAD_ESQ - PAD_DIR;
  const usavelH = H - PAD_TOPO - PAD_BASE;

  const maximo = Math.max(1, ...pontos.flatMap((p) => [p.criadas, p.entregues]));
  const marcas = niceTicks(maximo, 4);
  const topo = marcas[marcas.length - 1];

  const x = makeXScale(pontos.length, PAD_ESQ, W - PAD_DIR);
  const y = makeYScale(0, topo, PAD_TOPO, PAD_TOPO + usavelH);

  const ptsCriadas: Point[] = pontos.map((p, i) => ({
    x: x(i),
    y: y(p.criadas),
  }));
  const ptsEntregues: Point[] = pontos.map((p, i) => ({
    x: x(i),
    y: y(p.entregues),
  }));
  const base = PAD_TOPO + usavelH;

  const ativo = hover !== null ? pontos[hover] : null;

  // Um rótulo a cada N pontos: 90 datas empilhadas no eixo viram uma tarja
  // cinza. O passo é calculado, não fixo, para o eixo ficar legível em
  // qualquer período.
  //
  // **E depende da LARGURA, não só da quantidade.** O SVG escala junto com
  // o cartão: num painel de 380px o texto de 10 unidades vira menos de 5px
  // reais, e oito datas viram um borrão. Medido no navegador em
  // 3/set/2026. Por isso metade dos rótulos some em contêiner estreito —
  // pela consulta de contêiner do cartão, sem JavaScript de medição.
  const passo = Math.max(1, Math.ceil(pontos.length / 8));
  const soEmCartaoLargo = (i: number) =>
    i % (passo * 2) !== 0 && i !== pontos.length - 1;

  function moverPelo(clientX: number, alvo: SVGSVGElement) {
    const r = alvo.getBoundingClientRect();
    const relX = ((clientX - r.left) / r.width) * W;
    const i = Math.round(
      ((relX - PAD_ESQ) / (usavelW || 1)) * (pontos.length - 1)
    );
    setHover(Math.max(0, Math.min(pontos.length - 1, i)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-fg-secondary flex items-center gap-4 text-[length:var(--text-caption-size)]">
          <Legenda cor="var(--chart-2)" rotulo="Criadas" />
          <Legenda cor="var(--chart-1)" rotulo="Entregues" />
        </div>

        {/* O grão só é escolhível quando faz sentido: num período de sete
            dias, "Mês" desenharia um ponto só. */}
        {grao !== "dia" ? (
          <div
            role="group"
            aria-label="Agrupamento do gráfico"
            className="border-line inline-flex overflow-hidden rounded-sm border"
          >
            {(["semana", "mes"] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={grao === g}
                onClick={() => onGrao(g)}
                className={`px-2.5 py-1 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
                  grao === g
                    ? "bg-sunken text-fg font-medium"
                    : "text-fg-secondary hover:bg-hover"
                }`}
              >
                {g === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-pan-y"
          onMouseMove={(e) => moverPelo(e.clientX, e.currentTarget)}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={descricaoDoGrafico(pontos)}
        >
          <defs>
            <linearGradient id={idCriadas} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={idEntregues} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grade leve: só as horizontais, e no tom mais fraco que existe.
              Grade forte compete com o dado. */}
          {marcas.map((v) => (
            <g key={v}>
              <line
                x1={PAD_ESQ}
                x2={W - PAD_DIR}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD_ESQ - 6}
                y={y(v) + 3.5}
                textAnchor="end"
                className="tnum"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {v}
              </text>
            </g>
          ))}

          <path d={closedAreaPath(ptsCriadas, base)} fill={`url(#${idCriadas})`} />
          <path
            d={closedAreaPath(ptsEntregues, base)}
            fill={`url(#${idEntregues})`}
          />

          <Linha pontos={ptsCriadas} cor="var(--chart-2)" tracejada />
          <Linha pontos={ptsEntregues} cor="var(--chart-1)" />

          {ativo && hover !== null ? (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD_TOPO}
                y2={base}
                stroke="var(--chart-crosshair)"
                strokeWidth={1}
              />
              <circle
                cx={x(hover)}
                cy={y(ativo.criadas)}
                r={3.5}
                fill="var(--chart-2)"
              />
              <circle
                cx={x(hover)}
                cy={y(ativo.entregues)}
                r={3.5}
                fill="var(--chart-1)"
              />
            </g>
          ) : null}

          {pontos.map((p, i) =>
            i % passo === 0 || i === pontos.length - 1 ? (
              <text
                key={p.de}
                x={x(i)}
                y={H - 8}
                // Primeiro e último encostam na borda: ancorados no meio,
                // metade do texto sairia do desenho.
                textAnchor={
                  i === 0
                    ? "start"
                    : i === pontos.length - 1
                      ? "end"
                      : "middle"
                }
                fontSize={10}
                fill="var(--text-muted)"
                className={soEmCartaoLargo(i) ? "@max-md:hidden" : undefined}
              >
                {p.rotulo}
              </text>
            ) : null
          )}
        </svg>

        {ativo ? (
          <div
            role="status"
            className="tf-glass border-line pointer-events-none absolute top-0 rounded-sm border px-3 py-2 text-[length:var(--text-caption-size)] shadow-[var(--shadow-popover)]"
            style={{
              // Trava nas bordas para a dica não sair do cartão no primeiro
              // e no último ponto.
              left: `clamp(0px, ${((x(hover ?? 0) - PAD_ESQ) / W) * 100}%, calc(100% - 11rem))`,
              minWidth: "10rem",
            }}
          >
            <p className="text-fg font-medium">{rotuloLongo(ativo)}</p>
            <p className="text-fg-secondary tnum mt-1">
              Criadas: {ativo.criadas}
            </p>
            <p className="text-fg-secondary tnum">
              Entregues: {ativo.entregues}
            </p>
            <p
              className="tnum mt-1"
              style={{
                color:
                  ativo.saldo > 0
                    ? "var(--status-due-soon-fg)"
                    : "var(--text-muted)",
              }}
            >
              Saldo: {ativo.saldo > 0 ? "+" : ""}
              {ativo.saldo}
              {ativo.saldo > 0 ? " (entrou mais do que saiu)" : ""}
            </p>
          </div>
        ) : null}
      </div>

      {/* A mesma informação em tabela, para quem lê com leitor de tela e
          para quem quer conferir número por número. Fechada por padrão:
          é alternativa, não duplicata visual. */}
      <details className="text-fg-secondary text-[length:var(--text-caption-size)]">
        <summary className="hover:text-fg cursor-pointer rounded-xs outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
          Ver os números do gráfico
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          {/* `relative`: ver a nota em SectorDetailTable. */}
          <table className="relative w-full text-left">
            <caption className="sr-only">
              Demandas criadas e entregues por intervalo
            </caption>
            <thead className="text-fg-muted">
              <tr>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Intervalo
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-medium">
                  Criadas
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-medium">
                  Entregues
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.de}>
                  <td className="py-1 pr-3">{rotuloLongo(p)}</td>
                  <td className="tnum py-1 pr-3 text-right">{p.criadas}</td>
                  <td className="tnum py-1 pr-3 text-right">{p.entregues}</td>
                  <td className="tnum py-1 text-right">
                    {p.saldo > 0 ? "+" : ""}
                    {p.saldo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {onSelecionarIntervalo ? (
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Passe o cursor para ver os números de cada intervalo.
        </p>
      ) : null}
    </div>
  );
}

function Linha({
  pontos,
  cor,
  tracejada,
}: {
  pontos: Point[];
  cor: string;
  tracejada?: boolean;
}) {
  const comprimento = polylineLength(pontos);
  return (
    <path
      d={smoothLinePath(pontos)}
      fill="none"
      stroke={cor}
      strokeWidth={2}
      strokeLinecap="round"
      // A linha se desenha UMA vez na entrada. `tf-draw` já existia para o
      // micrográfico; o bloco global de `prefers-reduced-motion` zera a
      // duração, e o traço aparece inteiro de imediato.
      strokeDasharray={tracejada ? "5 4" : comprimento}
      style={
        tracejada
          ? undefined
          : ({
              "--tf-draw-length": comprimento,
              animation: "tf-draw var(--dur-slow) var(--ease-out) forwards",
            } as CSSProperties)
      }
    />
  );
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-0.5 w-4 rounded-full"
        style={{ background: cor }}
      />
      {rotulo}
    </span>
  );
}

function rotuloLongo(p: { de: string; ate: string; rotulo: string }): string {
  const br = (iso: string) => iso.split("-").reverse().join("/");
  return p.de === p.ate ? br(p.de) : `${br(p.de)} a ${br(p.ate)}`;
}

/**
 * A conclusão do gráfico em uma frase, para quem não o vê.
 *
 * Diz o que a forma mostra — a fila cresceu, encolheu ou ficou igual —, e
 * não "gráfico de linhas com duas séries", que é a descrição do desenho e
 * não da informação.
 */
function descricaoDoGrafico(pontos: PontoDeFluxo[]): string {
  const criadas = pontos.reduce((s, p) => s + p.criadas, 0);
  const entregues = pontos.reduce((s, p) => s + p.entregues, 0);
  const saldo = criadas - entregues;
  const veredito =
    saldo > 0
      ? `entraram ${saldo} a mais do que saíram`
      : saldo < 0
        ? `saíram ${-saldo} a mais do que entraram`
        : "entrou e saiu a mesma quantidade";
  return `Fluxo de demandas: ${criadas} criadas e ${entregues} entregues no período — ${veredito}.`;
}
