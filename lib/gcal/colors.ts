// Mapeia a cor (hex livre) do setor para o colorId de evento mais próximo do
// Google Agenda (paleta fixa de 11). Distância euclidiana simples no RGB.

const GCAL_EVENT_COLORS: Record<string, string> = {
  "1": "#7986CB", // Lavender
  "2": "#33B679", // Sage
  "3": "#8E24AA", // Grape
  "4": "#E67C73", // Flamingo
  "5": "#F6BF26", // Banana
  "6": "#F4511E", // Tangerine
  "7": "#039BE5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3F51B5", // Blueberry
  "10": "#0B8043", // Basil
  "11": "#D50000", // Tomato
};

function toRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function nearestColorId(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const rgb = toRgb(hex);
  if (!rgb) return null;

  let best = "1";
  let bestDist = Infinity;
  for (const [id, ref] of Object.entries(GCAL_EVENT_COLORS)) {
    const [r, g, b] = toRgb(ref)!;
    const dist = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = id;
    }
  }
  return best;
}
