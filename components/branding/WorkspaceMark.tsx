"use client";

import { useState } from "react";

import { TaflowMark } from "./TaflowMark";

/**
 * A marca da empresa onde antes ficava o nome escrito (0080).
 *
 * Existe para que a regra de queda more num arquivo só. Ela tem três degraus
 * e a ordem importa:
 *
 *   logo da empresa → marca do TAFLOW → nome escrito
 *
 * O segundo degrau é o white-label: a casca nasce com a nossa identidade e o
 * cliente a substitui pela dele quando quiser.
 *
 * **`queda="nome"` pula o segundo degrau, e há dois lugares assim.**
 *
 * O cabeçalho do contrato, porque identifica a parte contratada: cliente sem
 * logo cairia num contrato dele com a marca do fornecedor de software
 * estampada — documento jurídico que não é nosso.
 *
 * E o seletor de empresas, porque ali a marca serve para distinguir uma
 * empresa da outra. Três empresas sem logo mostrando a mesma marca do
 * produto seriam três linhas iguais.
 *
 * O terceiro degrau é a rede de segurança para a logo DO CLIENTE: se ela não
 * carregar — arquivo removido do bucket, URL quebrada —, o nome aparece.
 * Nunca um ícone quebrado.
 *
 * A marca do produto não precisa dessa rede desde set/2026: ela é SVG
 * desenhado em linha (), não arquivo. Não tem como dar 404, e
 * troca de cor com o tema — o que também dispensou a placa clara, que
 * existia só porque logo de terceiro não dá para recolorir.
 */


export type ContextoDaMarca = "casca" | "menu" | "impressao";

/**
 * Onde parar a queda.
 *
 * Separado do tamanho de propósito: são perguntas diferentes, e amarrá-las
 * dava resposta errada no seletor de empresas. Lá o item é pequeno (`menu`)
 * mas NÃO pode cair na marca do produto — três empresas sem logo virariam
 * três linhas idênticas, e o seletor existe justamente para distingui-las.
 */
export type QuedaDaMarca = "marca" | "nome";

const MEDIDAS: Record<ContextoDaMarca, { largura: string; altura: string }> = {
  casca: { largura: "var(--logo-shell-w)", altura: "var(--logo-shell-h-max)" },
  menu: { largura: "var(--logo-menu-w)", altura: "var(--logo-menu-h-max)" },
  impressao: {
    largura: "var(--logo-print-w)",
    altura: "var(--logo-print-h-max)",
  },
};

export function WorkspaceMark({
  name,
  logoUrl,
  contexto = "casca",
  queda = "marca",
  className,
}: {
  name: string;
  logoUrl: string | null;
  contexto?: ContextoDaMarca;
  queda?: QuedaDaMarca;
  className?: string;
}) {
  // Guarda QUAL src falhou, em vez de um booleano. Com booleano, trocar a
  // logo exigiria zerar o estado num efeito — e efeito que chama setState é
  // justamente o que o React Compiler recusa neste projeto.
  const [falhouEm, setFalhouEm] = useState<string | null>(null);

  const { largura, altura } = MEDIDAS[contexto];

  // A logo da empresa só vale se existir E tiver carregado.
  const temLogoPropria = logoUrl !== null && falhouEm !== logoUrl;

  if (!temLogoPropria && queda === "marca") {
    // Altura do token + `aspect-ratio` DECLARADA, e não `width: auto`.
    //
    // SVG com viewBox tem proporção intrínseca mas não tamanho intrínseco:
    // com `width: auto` o navegador não deduz a largura a partir da altura e
    // a marca renderiza a 0×0 — visível no DOM, invisível na tela. Foi o que
    // aconteceu na primeira tentativa.
    return (
      <span className={`inline-flex shrink-0 items-center ${className ?? ""}`}>
        <TaflowMark
          // Decorativa quando o nome da empresa não está em jogo — aqui ela
          // ESTÁ, porque substitui o nome na casca.
          title={name}
          className="block"
          style={{ height: altura, width: "auto", maxWidth: largura }}
        />
      </span>
    );
  }

  if (!temLogoPropria) {
    return (
      <span
        className={
          className ??
          "text-fg truncate text-[length:var(--text-h3-size)] font-medium"
        }
      >
        {name}
      </span>
    );
  }

  const src = logoUrl;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm ${className ?? ""}`}
      style={{
        background: "var(--logo-plate)",
        padding: "var(--logo-plate-pad)",
      }}
    >
      {/* `max-width` + `max-height` com dimensão automática, e não largura
          fixa: com `width` cravado, o teto de altura achataria a imagem em
          vez de encolhê-la. Assim a logo cabe na caixa mantendo a
          proporção, venha ela deitada ou em pé. */}
      {/* next/image exigiria config de domínio e proporção conhecida, que
          logo de terceiro não tem. E a otimização já aconteceu no envio: a
          imagem foi reduzida a 512px e convertida para WebP. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        // As DUAS coisas são necessárias, e a de cima é a que faltava.
        //
        // Este componente é renderizado no servidor. O navegador começa a
        // baixar a imagem do HTML que chegou e pode FALHAR antes de o React
        // hidratar. O evento `error` dispara sem ninguém escutando, o
        // `onError` abaixo nunca roda, e a casca fica com uma imagem de 0×0
        // no lugar do nome da empresa — foi o que aconteceu em 31/ago/2026,
        // quando a marca do produto ainda era um arquivo que dava 404.
        //
        // No callback de ref, que roda no commit, dá para PERGUNTAR o
        // resultado em vez de esperar o evento: imagem terminada
        // (`complete`) com largura natural zero é imagem que falhou.
        ref={(el) => {
          if (el && el.complete && el.naturalWidth === 0) setFalhouEm(src);
        }}
        // Continua valendo para o que falhar depois da hidratação — logo
        // removida do bucket, troca de empresa, rede caindo no meio.
        onError={() => setFalhouEm(src)}
        style={{
          maxWidth: largura,
          maxHeight: altura,
          width: "auto",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </span>
  );
}
