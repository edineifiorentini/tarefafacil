/**
 * Geometria de gráfico — pura e testável. Nenhum componente calcula caminho
 * SVG na mão: todos consomem estas funções, para que a curva tenha a mesma
 * assinatura visual em qualquer gráfico do produto.
 */

export type Point = { x: number; y: number };

/**
 * Curva suave passando pelos pontos: quadráticas ancoradas nos pontos médios
 * entre vizinhos. É estável (nunca "estoura" acima do dado, como acontece com
 * Bézier cúbica mal amortecida) e barata de calcular.
 */
export function smoothLinePath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Mesma curva, fechada até uma linha de base — para o preenchimento em área. */
export function closedAreaPath(points: Point[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = smoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

/**
 * Escala vertical: converte valor do domínio em coordenada de tela (y cresce
 * para baixo no SVG). `min`/`max` já vêm calculados por quem chama.
 */
export function makeYScale(
  min: number,
  max: number,
  top: number,
  bottom: number
): (value: number) => number {
  const range = max - min || 1;
  const height = bottom - top;
  return (value) => bottom - ((value - min) / range) * height;
}

/** Escala horizontal por índice, distribuindo os pontos igualmente. */
export function makeXScale(
  count: number,
  left: number,
  right: number
): (index: number) => number {
  if (count <= 1) return () => left;
  const step = (right - left) / (count - 1);
  return (index) => left + index * step;
}

/**
 * Marcas "redondas" para o eixo: escolhe um passo legível (1, 2, 2.5 ou 5
 * vezes uma potência de 10) que cubra o máximo em aproximadamente `count`
 * divisões. Ex.: máximo 57 com 4 divisões -> [0, 15, 30, 45, 60].
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  let stepFactor: number;
  if (normalized <= 1) stepFactor = 1;
  else if (normalized <= 1.5) stepFactor = 1.5;
  else if (normalized <= 2) stepFactor = 2;
  else if (normalized <= 2.5) stepFactor = 2.5;
  else if (normalized <= 5) stepFactor = 5;
  else stepFactor = 10;

  const step = stepFactor * magnitude;
  // O topo do eixo fecha ACIMA do máximo, senão a curva encosta na borda.
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let i = 0; i * step <= top + step * 0.001; i += 1) {
    // step pode ser fracionário (2.5 * 10^-1): arredonda o ruído binário.
    ticks.push(Number((i * step).toFixed(10)));
  }
  return ticks;
}

/** Comprimento aproximado de uma polilinha — alimenta o traço animado. */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  return Math.ceil(total * 1.15); // folga para a curvatura
}
