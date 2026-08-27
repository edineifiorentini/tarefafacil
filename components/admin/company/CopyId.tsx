"use client";

import { useState } from "react";

import { IconCheck, IconCopy } from "@tabler/icons-react";

/**
 * ID copiável (especificação 9.6).
 *
 * Existe porque a primeira coisa que se faz com o ID de uma empresa é colar
 * numa consulta ou num chamado, e selecionar um uuid com o mouse erra o
 * último caractere metade das vezes.
 *
 * A confirmação é visual e volta sozinha: um toast para copiar um id seria
 * mais barulho do que a ação merece.
 */
export function CopyId({ id }: { id: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(id);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // Sem permissão de área de transferência: o id continua visível na
      // tela para seleção manual, então não há o que avisar.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      className="text-fg-muted hover:text-fg-secondary flex items-center gap-1.5 rounded-sm font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      {id.slice(0, 8)}…
      {copiado ? (
        <IconCheck size={14} stroke={2} aria-hidden />
      ) : (
        <IconCopy size={14} stroke={1.75} aria-hidden />
      )}
      <span className="sr-only">
        {copiado ? "ID copiado" : "Copiar ID da empresa"}
      </span>
    </button>
  );
}
