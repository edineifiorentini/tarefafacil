"use client";

import { useRef, useState } from "react";

import {
  IconBlockquote,
  IconBold,
  IconCode,
  IconEye,
  IconH2,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
} from "@tabler/icons-react";

import { MarkdownBasico } from "@/lib/markdown/basico";

import { Textarea } from "./Textarea";

/**
 * Campo de texto com marcação simples.
 *
 * **É um campo de TEXTO com atalhos, não um editor rico.** A diferença
 * importa: o que vai para o banco continua sendo o que a pessoa vê no
 * campo, e a descrição de uma demanda chega à página pública do cliente. Um
 * editor que guardasse HTML obrigaria a sanitizar do outro lado, e
 * sanitização é a coisa que se esquece de atualizar.
 *
 * Os botões inserem a marcação na seleção. Nada de `execCommand`, que é
 * obsoleto e se comporta diferente em cada navegador.
 *
 * A prévia usa o MESMO renderizador da página do cliente. Se as duas
 * telas usassem caminhos diferentes, a prévia acabaria mentindo — e a
 * primeira vez que isso aparecesse seria com o cliente olhando.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  rows?: number;
  "aria-label"?: string;
}) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const [prevendo, setPrevendo] = useState(false);

  /** Envolve a seleção. Sem seleção, deixa o cursor no meio dos marcadores. */
  function envolver(marca: string) {
    const el = campo.current;
    if (!el) return;
    const { selectionStart: i, selectionEnd: f } = el;
    const dentro = value.slice(i, f);
    const novo = `${value.slice(0, i)}${marca}${dentro}${marca}${value.slice(f)}`;
    onChange(novo);
    // Devolve o foco e posiciona o cursor: sem isto quem clicou no botão
    // precisa achar de novo onde estava escrevendo.
    queueMicrotask(() => {
      el.focus();
      const pos = dentro ? f + marca.length * 2 : i + marca.length;
      el.setSelectionRange(dentro ? pos : pos, pos);
    });
  }

  /** Coloca um prefixo no começo de cada linha selecionada. */
  function prefixar(prefixo: string) {
    const el = campo.current;
    if (!el) return;
    const { selectionStart: i, selectionEnd: f } = el;
    const inicioDaLinha = value.lastIndexOf("\n", i - 1) + 1;
    const fimDaLinha =
      value.indexOf("\n", f) === -1 ? value.length : value.indexOf("\n", f);
    const trecho = value.slice(inicioDaLinha, fimDaLinha);
    const marcado = trecho
      .split("\n")
      .map((l) => (l.startsWith(prefixo) ? l : `${prefixo}${l}`))
      .join("\n");
    onChange(value.slice(0, inicioDaLinha) + marcado + value.slice(fimDaLinha));
    queueMicrotask(() => {
      el.focus();
      const fim = inicioDaLinha + marcado.length;
      el.setSelectionRange(fim, fim);
    });
  }

  function inserirLink() {
    const el = campo.current;
    if (!el) return;
    const { selectionStart: i, selectionEnd: f } = el;
    const rotulo = value.slice(i, f) || "texto do link";
    const modelo = `[${rotulo}](https://)`;
    onChange(value.slice(0, i) + modelo + value.slice(f));
    queueMicrotask(() => {
      el.focus();
      // Deixa o endereço selecionado: é o que falta preencher.
      const inicioUrl = i + rotulo.length + 3;
      el.setSelectionRange(inicioUrl, inicioUrl + 8);
    });
  }

  return (
    <div className="border-line flex flex-col overflow-hidden rounded-md border">
      <div
        role="toolbar"
        aria-label="Formatação do texto"
        className="border-line bg-sunken flex flex-wrap items-center gap-0.5 border-b px-1 py-1"
      >
        <Acao rotulo="Negrito" icon={IconBold} onClick={() => envolver("**")} />
        <Acao
          rotulo="Itálico"
          icon={IconItalic}
          onClick={() => envolver("*")}
        />
        <Acao rotulo="Código" icon={IconCode} onClick={() => envolver("`")} />
        <span className="bg-line mx-1 h-5 w-px" aria-hidden />
        <Acao rotulo="Título" icon={IconH2} onClick={() => prefixar("## ")} />
        <Acao rotulo="Lista" icon={IconList} onClick={() => prefixar("- ")} />
        <Acao
          rotulo="Lista numerada"
          icon={IconListNumbers}
          onClick={() => prefixar("1. ")}
        />
        <Acao
          rotulo="Citação"
          icon={IconBlockquote}
          onClick={() => prefixar("> ")}
        />
        <span className="bg-line mx-1 h-5 w-px" aria-hidden />
        <Acao rotulo="Link" icon={IconLink} onClick={inserirLink} />

        <div className="ml-auto">
          <Acao
            rotulo={prevendo ? "Voltar a editar" : "Ver como fica"}
            icon={IconEye}
            ativo={prevendo}
            onClick={() => setPrevendo((v) => !v)}
          />
        </div>
      </div>

      {prevendo ? (
        <div className="text-fg min-h-[6rem] px-3 py-2 text-[length:var(--text-small-size)]">
          {value.trim() ? (
            <MarkdownBasico texto={value} />
          ) : (
            <p className="text-fg-muted">Nada escrito ainda.</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={campo}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="rounded-none border-0 focus-visible:outline-0"
        />
      )}
    </div>
  );
}

function Acao({
  rotulo,
  icon: Icon,
  onClick,
  ativo,
}: {
  rotulo: string;
  icon: typeof IconBold;
  onClick: () => void;
  ativo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ativo}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)] ${
        ativo
          ? "bg-selected text-fg"
          : "text-fg-secondary hover:bg-hover hover:text-fg"
      }`}
    >
      <Icon size={16} stroke={1.75} aria-hidden />
    </button>
  );
}
