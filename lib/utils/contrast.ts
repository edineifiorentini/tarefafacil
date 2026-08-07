// Cálculo de contraste WCAG 2.1 (razão entre luminâncias relativas).
// Usado na story de fundação para exibir a razão de cada combinação e nos
// testes que garantem os mínimos de acessibilidade (seção 11.1 do design).

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace(/^#/, "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = Number.parseInt(h, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Luminância relativa (0 = preto, 1 = branco) de uma cor hex. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste entre duas cores hex (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Formata a razão como "6.4:1". */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}
