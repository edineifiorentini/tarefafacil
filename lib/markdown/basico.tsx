import type { ReactNode } from "react";

/**
 * Um subconjunto pequeno de Markdown, renderizado como árvore React.
 *
 * **NÃO devolve HTML, e essa é a decisão de segurança.** A descrição de uma
 * demanda vai para a página pública do cliente (`app/d/[token]`), aberta sem
 * login. Um renderizador que montasse string de HTML e a entregasse a
 * `dangerouslySetInnerHTML` faria a segurança depender de eu não ter errado
 * nenhum caso — e casos de escape em Markdown são exatamente onde se erra.
 *
 * Aqui não existe string de HTML em momento nenhum. Cada pedaço de texto
 * vira nó de texto do React, que escapa sozinho; as únicas tags que existem
 * são as que este arquivo cria. `<script>` digitado na descrição aparece
 * escrito, como o autor digitou.
 *
 * **O banco continua guardando TEXTO.** Nada migra, nada é convertido, e
 * descrição escrita antes disto existir continua válida — sem marcação, ela
 * é um parágrafo.
 *
 * O subconjunto é o que a barra de botões oferece, e nada além: título,
 * negrito, itálico, código, lista, citação e link. Markdown completo traria
 * tabela, imagem e HTML embutido, que é justamente o que não se quer numa
 * página que o cliente abre.
 */

/** Só estes esquemas viram link. `javascript:` e `data:` ficam como texto. */
function urlSegura(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Negrito, itálico, código e link dentro de uma linha.
 *
 * Uma varredura só, com alternância: sem aninhamento, sem recursão. Negrito
 * dentro de link e link dentro de negrito não valem — e é melhor assim, que
 * é o que mantém o resultado previsível.
 */
const INLINE =
  /(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\s]+\))/g;

function inline(texto: string, chave: string): ReactNode[] {
  const saida: ReactNode[] = [];
  let ultimo = 0;
  let i = 0;

  for (const m of texto.matchAll(INLINE)) {
    const inicio = m.index;
    if (inicio > ultimo) saida.push(texto.slice(ultimo, inicio));
    const t = m[0];
    const k = `${chave}-${i++}`;

    if (t.startsWith("**")) {
      saida.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    } else if (t.startsWith("`")) {
      saida.push(
        <code
          key={k}
          className="bg-sunken rounded-sm px-1 py-0.5 font-mono text-[0.9em]"
        >
          {t.slice(1, -1)}
        </code>
      );
    } else if (t.startsWith("[")) {
      const corte = t.indexOf("](");
      const rotulo = t.slice(1, corte);
      const url = t.slice(corte + 2, -1);
      saida.push(
        urlSegura(url) ? (
          <a
            key={k}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg-link underline"
          >
            {rotulo}
          </a>
        ) : (
          // Esquema não permitido: vira texto, sem sumir com o que a pessoa
          // escreveu. Esconder o conteúdo seria pior que não linkar.
          t
        )
      );
    } else {
      saida.push(<em key={k}>{t.slice(1, -1)}</em>);
    }
    ultimo = inicio + t.length;
  }

  if (ultimo < texto.length) saida.push(texto.slice(ultimo));
  return saida;
}

type Bloco =
  | { tipo: "titulo"; nivel: 2 | 3; linhas: string[] }
  | { tipo: "paragrafo"; linhas: string[] }
  | { tipo: "citacao"; linhas: string[] }
  | { tipo: "lista"; ordenada: boolean; linhas: string[] };

/**
 * Agrupa as linhas em blocos.
 *
 * Linha vazia fecha o bloco. Linhas seguidas dentro de um parágrafo viram
 * quebra de linha e não parágrafos separados: quem escreve descrição de
 * tarefa aperta Enter esperando ver a quebra, não a regra tipográfica do
 * Markdown de verdade.
 */
function emBlocos(texto: string): Bloco[] {
  const blocos: Bloco[] = [];

  for (const linha of texto.replace(/\r\n/g, "\n").split("\n")) {
    const atual = blocos[blocos.length - 1];

    if (linha.trim() === "") {
      // Fecha o bloco corrente empurrando um marcador vazio na próxima volta.
      if (atual) blocos.push({ tipo: "paragrafo", linhas: [] });
      continue;
    }

    const titulo = /^(#{2,3})\s+(.*)$/.exec(linha);
    if (titulo) {
      blocos.push({
        tipo: "titulo",
        nivel: titulo[1].length === 2 ? 2 : 3,
        linhas: [titulo[2]],
      });
      continue;
    }

    const citacao = /^>\s?(.*)$/.exec(linha);
    if (citacao) {
      if (atual?.tipo === "citacao") atual.linhas.push(citacao[1]);
      else blocos.push({ tipo: "citacao", linhas: [citacao[1]] });
      continue;
    }

    const item = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(linha);
    if (item) {
      const ordenada = /\d/.test(item[1]);
      if (atual?.tipo === "lista" && atual.ordenada === ordenada) {
        atual.linhas.push(item[2]);
      } else {
        blocos.push({ tipo: "lista", ordenada, linhas: [item[2]] });
      }
      continue;
    }

    if (atual?.tipo === "paragrafo" && atual.linhas.length > 0) {
      atual.linhas.push(linha);
    } else {
      blocos.push({ tipo: "paragrafo", linhas: [linha] });
    }
  }

  return blocos.filter((b) => b.linhas.length > 0);
}

/** Texto com marcação simples, desenhado. */
export function MarkdownBasico({
  texto,
  className,
}: {
  texto: string;
  className?: string;
}) {
  const blocos = emBlocos(texto);
  if (blocos.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {blocos.map((b, i) => {
        const k = `b${i}`;

        if (b.tipo === "titulo") {
          const Tag = b.nivel === 2 ? "h4" : "h5";
          return (
            <Tag key={k} className="text-fg font-semibold">
              {inline(b.linhas[0], k)}
            </Tag>
          );
        }

        if (b.tipo === "citacao") {
          return (
            <blockquote
              key={k}
              className="border-line text-fg-secondary border-l-2 pl-3"
            >
              {b.linhas.map((l, j) => (
                <p key={`${k}-${j}`}>{inline(l, `${k}-${j}`)}</p>
              ))}
            </blockquote>
          );
        }

        if (b.tipo === "lista") {
          const Tag = b.ordenada ? "ol" : "ul";
          return (
            <Tag
              key={k}
              className={
                b.ordenada
                  ? "list-decimal pl-5 [&>li]:mt-1"
                  : "list-disc pl-5 [&>li]:mt-1"
              }
            >
              {b.linhas.map((l, j) => (
                <li key={`${k}-${j}`}>{inline(l, `${k}-${j}`)}</li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={k} className="whitespace-pre-wrap">
            {b.linhas.map((l, j) => (
              <span key={`${k}-${j}`}>
                {j > 0 ? <br /> : null}
                {inline(l, `${k}-${j}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
