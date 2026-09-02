/**
 * A costura entre os dois painéis.
 *
 * O desenho é o percurso da ligatura "fl" da marca: desce, abre para a
 * esquerda no meio da tela, volta e sai. É a assinatura da tela — o que
 * faz esta porta de entrada ser do TAFLOW e não de qualquer SaaS com dois
 * painéis.
 *
 * **Por que `preserveAspectRatio="none"` + `vector-effect`.** A faixa tem
 * altura de tela (700px, 1400px, o que vier) e largura fixa em vw. Com
 * proporção preservada, a curva ou sobraria ou faltaria. Esticando, o
 * PREENCHIMENTO acompanha a altura — mas o traço engrossaria junto, e um
 * traço de 9px viraria 40px numa tela alta. `vector-effect:
 * non-scaling-stroke` desliga esse escalonamento só para o traço: ele sai
 * com a mesma espessura em qualquer resolução.
 *
 * O brilho é um segundo traço, mais largo e translúcido, atrás do
 * primeiro. Não é `filter: blur` de propósito: desfocar uma faixa da
 * altura da tela inteira custa caro e esta é a tela que não pode demorar.
 *
 * A versão horizontal é a MESMA curva com x e y trocados. No celular os
 * painéis empilham, e a costura passa a separar o topo grafite do
 * formulário — mesmo desenho, outro eixo.
 */

/** Curva aberta, do topo à base, em viewBox 100×1000. */
const VERTICAL =
  "M 74,0 C 62,120 20,232 14,400 C 8,572 52,640 62,782 C 70,892 66,940 66,1000";

/** A mesma, transposta, em viewBox 1000×100. */
const HORIZONTAL =
  "M 0,74 C 120,62 232,20 400,14 C 572,8 640,52 782,62 C 892,70 940,66 1000,66";

type Orientacao = "vertical" | "horizontal";

const DESENHO: Record<
  Orientacao,
  { curva: string; viewBox: string; fecho: string }
> = {
  // Fecha pela direita: o painel do formulário invade o grafite.
  vertical: { curva: VERTICAL, viewBox: "0 0 100 1000", fecho: "L 100,1000 L 100,0 Z" },
  // Fecha por baixo: o formulário invade o grafite por cima.
  horizontal: { curva: HORIZONTAL, viewBox: "0 0 1000 100", fecho: "L 1000,100 L 0,100 Z" },
};

export function FlowDivider({
  orientacao = "vertical",
  className,
  style,
}: {
  orientacao?: Orientacao;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { curva, viewBox, fecho } = DESENHO[orientacao];

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={`${curva} ${fecho}`} fill="var(--auth-panel-bg)" />
      {/* A espessura vai por `style` e não por atributo: atributo de
          apresentação com `var()` depende de o navegador tratá-lo como
          declaração CSS, e aqui não vale arriscar — se falhasse, o traço
          sumiria (largura 0) em vez de degradar. */}
      <path
        d={curva}
        fill="none"
        stroke="var(--auth-accent)"
        strokeOpacity="0.14"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ strokeWidth: "var(--auth-seam-glow)" }}
      />
      <path
        d={curva}
        fill="none"
        stroke="var(--auth-accent)"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ strokeWidth: "var(--auth-seam-stroke)" }}
      />
    </svg>
  );
}
