import { BRAND_COOKIE, type BrandTheme } from "./themes";

/** Um ano: a cor muda quando a empresa decide, não sozinha. */
const UM_ANO = 60 * 60 * 24 * 365;

/**
 * Pinta a marca agora e guarda para a próxima navegação.
 *
 * Fora de qualquer componente de propósito: escrever em `document` dentro do
 * corpo de um componente faz o React Compiler acusar mutação de global — ele
 * não consegue ver que a chamada só acontece em manipulador de evento.
 *
 * O atributo vive no `<html>` porque menu, diálogo e tooltip do Radix
 * renderizam em portal, fora da árvore da página; num wrapper mais interno
 * eles perderiam a cor.
 *
 * O cookie não é `httpOnly`: é preferência de aparência, não segredo, e é o
 * que permite o servidor já mandar o HTML pintado, sem piscar.
 */
export function applyBrand(theme: BrandTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.brand = theme;
  document.cookie = `${BRAND_COOKIE}=${theme}; path=/; max-age=${UM_ANO}; samesite=lax`;
}

/** O que o `<html>` está mostrando agora. */
export function currentBrand(): string | undefined {
  return typeof document === "undefined"
    ? undefined
    : document.documentElement.dataset.brand;
}
