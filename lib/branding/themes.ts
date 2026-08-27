/**
 * As cores de marca que a empresa pode escolher.
 *
 * Lista curta, e não seletor livre. Duas razões, e a segunda é a que
 * importa:
 *
 * 1. Cada tom precisa passar 4.5:1 como texto de link sobre branco. Um
 *    campo aberto aceita amarelo, e aí o link fica ilegível — e o sistema
 *    não teria como recusar sem parecer que quebrou.
 * 2. **Amarelo e vermelho ficam de fora.** Não é gosto: eles colidem com o
 *    aviso e com o atraso. Uma empresa de marca vermelha veria o sistema
 *    inteiro parecendo alarmado, e o chip de "21 ago" atrasado deixaria de
 *    saltar — que é a única coisa que ele existe para fazer.
 *
 * A rampa de cada tom vive em `styles/tokens.css`, num bloco
 * `[data-brand="..."]`. Aqui fica só o que a tela precisa para desenhar a
 * escolha.
 */
export const BRAND_THEMES = [
  { id: "azul", label: "Azul", swatch: "#2563eb" },
  { id: "indigo", label: "Índigo", swatch: "#4f46e5" },
  { id: "lilas", label: "Lilás", swatch: "#7c3aed" },
  { id: "teal", label: "Teal", swatch: "#0d9488" },
  { id: "verde", label: "Verde", swatch: "#059669" },
  { id: "magenta", label: "Magenta", swatch: "#db2777" },
  { id: "grafite", label: "Grafite", swatch: "#475569" },
] as const;

export type BrandTheme = (typeof BRAND_THEMES)[number]["id"];

export const BRAND_DEFAULT: BrandTheme = "azul";

/** Nome do cookie que leva a cor até o `<html>` sem consultar o banco. */
export const BRAND_COOKIE = "brand_theme";

/**
 * Valida o que vem do banco, do cookie ou da rede.
 *
 * Cai no padrão em vez de estourar: cor de marca inválida não pode derrubar
 * a renderização de uma página inteira.
 */
export function parseBrandTheme(valor: unknown): BrandTheme {
  return typeof valor === "string" && BRAND_THEMES.some((t) => t.id === valor)
    ? (valor as BrandTheme)
    : BRAND_DEFAULT;
}

/**
 * O verde tem uma ressalva que vale registrar.
 *
 * O sistema reserva verde para dado financeiro positivo (`--positive`, e a
 * regra de cores do CLAUDE.md). Escolhendo verde como marca, os dois passam
 * a conviver na mesma tela e o número positivo do Financeiro perde parte do
 * destaque — ele continua verde, mas deixa de ser o único.
 *
 * O dono pediu a opção mesmo assim, em 26/ago. O `teal` existe na lista
 * como a saída que dá o clima de verde sem encostar nesse sinal.
 */
export const BRAND_AVISOS: Partial<Record<BrandTheme, string>> = {
  verde:
    "Verde também marca dinheiro no Financeiro. Escolhendo verde para a marca, o número positivo deixa de ser o único verde da tela.",
};
