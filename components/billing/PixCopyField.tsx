"use client";

import { useEffect, useRef, useState } from "react";

import { IconCheck, IconCopy } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

/**
 * O código Pix copia e cola.
 *
 * **É o que quase todo mundo usa.** No celular — que é onde quase todo Pix é
 * pago — ninguém aponta a câmera para a própria tela. Por isso ele tem o
 * mesmo peso do QR na hierarquia, e não menos.
 *
 * O código NUNCA vai para log, analytics ou monitoramento de erro. Ele é um
 * instrumento de pagamento: quem tiver a string paga a cobrança.
 */
export function PixCopyField({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | null>(null);

  // Limpa o timer se o componente sair antes dos 2,5s — senão o `setState`
  // acontece em componente desmontado e vaza um aviso no console.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // Clipboard API recusa em contexto não seguro e em alguns navegadores
      // embutidos. O campo continua selecionável, então o caminho manual
      // existe — e dizer isso é melhor que um erro genérico.
      const campo = document.getElementById("pix-copia-e-cola");
      if (campo instanceof HTMLInputElement) campo.select();
      return;
    }
    setCopiado(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="pix-copia-e-cola"
        className="text-fg text-[length:var(--text-small-size)] font-medium"
      >
        Pix copia e cola
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="pix-copia-e-cola"
          readOnly
          value={codigo}
          onFocus={(e) => e.currentTarget.select()}
          className="border-line bg-sunken text-fg-secondary min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        />
        <Button
          size="sm"
          leadingIcon={copiado ? IconCheck : IconCopy}
          onClick={() => void copiar()}
        >
          {copiado ? "Código copiado" : "Copiar código"}
        </Button>
      </div>

      {/* A confirmação precisa CHEGAR a quem não vê o botão mudar de rótulo.
          `polite` para não atropelar o que o leitor de tela estiver dizendo. */}
      <p aria-live="polite" className="sr-only">
        {copiado ? "Código Pix copiado" : ""}
      </p>

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Cole o código no app do seu banco, na opção Pix copia e cola.
      </p>
    </div>
  );
}
