import type { NomeDeIcone } from "@/lib/landing/conteudo";

/**
 * Um ícone da biblioteca oficial da marca.
 *
 * Os arquivos vieram de `TAFLOW-Creative-Assets-v1` para
 * `public/marca/icons`, em duas versões: `light` (traço grafite, para
 * superfície clara) e `dark` (traço nuvem, para grafite). O Figma usa as
 * duas — a seção de fluxo pede as `/ Negative`, que são as `dark`.
 *
 * **Nada de ícone genérico no lugar de um que existe.** A grade é 24px
 * dentro de uma caixa de 48, com traço de 1,8px: um ícone de outra
 * biblioteca no meio destes teria outro peso e apareceria.
 *
 * O tamanho é explícito nos dois eixos, nunca `auto`: estes SVGs têm
 * `width`/`height` próprios de 48, e deixar um lado livre faria a caixa
 * desenhada não bater com a do design.
 */
export function MarcaIcone({
  nome,
  tom = "light",
  tamanho = 48,
  className,
}: {
  nome: NomeDeIcone;
  /** `light` = traço grafite; `dark` = traço nuvem, para fundo escuro. */
  tom?: "light" | "dark";
  tamanho?: number;
  className?: string;
}) {
  return (
    // SVG estático de ~1KB em /public. O otimizador de imagem do Next
    // recusa SVG sem `dangerouslyAllowSVG`, e ligar essa opção por causa
    // de um ícone nosso afrouxaria a configuração inteira por nada.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/marca/icons/${tom}/icon-${nome}.svg`}
      width={tamanho}
      height={tamanho}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: tamanho, height: tamanho }}
    />
  );
}
