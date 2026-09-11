"use client";

import { IconCheck, IconChevronUp, IconPlus } from "@tabler/icons-react";
import { useId, useState } from "react";

import {
  DESTINOS_FREQUENTES,
  GRUPOS_DE_OUTROS,
  ordenarDestinos,
  type Destino,
  type DestinoId,
} from "@/lib/tarefas/destinos";

import { IconeDoDestino } from "./IconeDoDestino";

const TOTAL_EM_OUTROS = GRUPOS_DE_OUTROS.reduce(
  (n, g) => n + g.destinos.length,
  0
);

/**
 * Onde a demanda vai ser publicada — escolha múltipla.
 *
 * **Fica na faixa principal da criação**, entre o prazo e "Mais detalhes":
 * o dono pediu que desse para escolher sem abrir nada (11/set/2026). Os seis
 * mais usados ficam à vista; o resto, em "Outros".
 *
 * **Nunca dentro de `<label>`.** O `Campo` do formulário de criação é um
 * label, e label reencaminha o clique para o botão de dentro — foi assim
 * que listas abriam e fechavam no mesmo clique (4ecbc9e). Por isso o
 * título é desenhado aqui, e o grupo tem nome por `aria-labelledby`.
 *
 * **O estado não depende só de cor**: o chip escolhido ganha fundo, peso e
 * um check. A logo nunca muda de cor — é da marca.
 */
export function DestinosSelector({
  value,
  onChange,
  titulo = "Onde vai ser publicado",
  tituloVisivel = true,
}: {
  value: readonly DestinoId[];
  onChange: (destinos: DestinoId[]) => void;
  titulo?: string;
  /**
   * Onde o recipiente já desenha o rótulo (a tarefa aberta usa o `Field`
   * do painel), o título some da tela mas continua dando nome ao grupo
   * para leitor de tela.
   */
  tituloVisivel?: boolean;
}) {
  const base = useId();
  const tituloId = `${base}-titulo`;
  const gruposId = `${base}-outros`;
  const escolhidos = new Set(value);

  const escolhidosEmOutros = GRUPOS_DE_OUTROS.reduce(
    (n, g) => n + g.destinos.filter((d) => escolhidos.has(d.id)).length,
    0
  );
  // Abrindo uma demanda que já vai para o LinkedIn, "Outros" começa aberto:
  // um destino escolhido e escondido parece não escolhido.
  const [outrosAbertos, setOutrosAbertos] = useState(escolhidosEmOutros > 0);

  function alternar(id: DestinoId) {
    const proximo = new Set(escolhidos);
    if (proximo.has(id)) proximo.delete(id);
    else proximo.add(id);
    onChange(ordenarDestinos([...proximo]));
  }

  const n = escolhidos.size;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span
          id={tituloId}
          className={
            tituloVisivel
              ? "text-fg-secondary text-[length:var(--text-caption-size)]"
              : "sr-only"
          }
        >
          {titulo}
        </span>
        <span
          aria-live="polite"
          className="text-fg-muted text-[length:var(--text-caption-size)]"
        >
          {n === 0
            ? "nenhum ainda"
            : n === 1
              ? "1 escolhido"
              : `${n} escolhidos`}
        </span>
      </div>

      <div
        role="group"
        aria-labelledby={tituloId}
        className="flex flex-wrap gap-1.5"
      >
        {DESTINOS_FREQUENTES.map((d) => (
          <Chip
            key={d.id}
            destino={d}
            marcado={escolhidos.has(d.id)}
            onToggle={() => alternar(d.id)}
          />
        ))}
        <button
          type="button"
          aria-expanded={outrosAbertos}
          aria-controls={gruposId}
          onClick={() => setOutrosAbertos((v) => !v)}
          className="text-fg-secondary border-line-strong hover:bg-hover hover:text-fg inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed pr-3 pl-2 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          {outrosAbertos ? (
            <IconChevronUp size={16} stroke={1.75} aria-hidden />
          ) : (
            <IconPlus size={16} stroke={1.75} aria-hidden />
          )}
          {outrosAbertos
            ? "Menos"
            : escolhidosEmOutros > 0
              ? `Outros · ${escolhidosEmOutros}`
              : `Outros (${TOTAL_EM_OUTROS})`}
        </button>
      </div>

      {outrosAbertos ? (
        <div
          id={gruposId}
          className="bg-sunken flex flex-col gap-2.5 rounded-md p-3"
        >
          {GRUPOS_DE_OUTROS.map((g) => (
            <div key={g.grupo} className="flex flex-col gap-1.5">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium">
                {g.grupo}
              </span>
              <div
                role="group"
                aria-label={g.grupo}
                className="flex flex-wrap gap-1.5"
              >
                {g.destinos.map((d) => (
                  <Chip
                    key={d.id}
                    destino={d}
                    marcado={escolhidos.has(d.id)}
                    onToggle={() => alternar(d.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  destino,
  marcado,
  onToggle,
}: {
  destino: Destino;
  marcado: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcado}
      onClick={onToggle}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border pr-3 pl-2 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
        marcado
          ? "text-fg border-[var(--chip-selected-border)] bg-[var(--chip-selected-bg)] font-medium"
          : "text-fg-secondary border-line-strong bg-card hover:bg-hover hover:text-fg"
      }`}
    >
      <IconeDoDestino id={destino.id} />
      <span>{destino.nome}</span>
      {marcado ? (
        <IconCheck size={14} stroke={2} aria-hidden className="text-fg-link" />
      ) : null}
    </button>
  );
}
