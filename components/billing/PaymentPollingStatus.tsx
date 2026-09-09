"use client";

import { IconRefresh } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

/**
 * "Estamos acompanhando o pagamento."
 *
 * **O contador é o tempo até a próxima CONSULTA, não o prazo para pagar.**
 * Confundir os dois é o erro clássico desta tela: quem lê "00:08" achando
 * que é o prazo do Pix entra em pânico e paga duas vezes. Por isso o rótulo
 * diz "Próxima verificação", e a validade do código vive em outro lugar,
 * com outra palavra.
 *
 * O botão é fallback, não o caminho principal. Quem confirma é o webhook do
 * provedor; isto aqui existe para quem não quer esperar e para o dia em que
 * um aviso se perder — que já aconteceu.
 */
export function PaymentPollingStatus({
  proximaEm,
  conferir,
  conferindo,
  erro,
}: {
  /** Segundos até a próxima consulta. `null` esconde o contador. */
  proximaEm: number | null;
  conferir: () => void;
  conferindo: boolean;
  erro: string | null;
}) {
  return (
    <div className="border-line bg-sunken flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {/* `motion-safe:` deixa o pulso de fora para quem pediu menos
            movimento — e sem ele o ponto continua visível, só parado. */}
        <span
          aria-hidden
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--warning)] motion-safe:animate-pulse"
        />
        <div>
          <p className="text-fg text-[length:var(--text-small-size)] font-medium">
            Verificando pagamento
          </p>
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            A confirmação acontece automaticamente.
          </p>

          {/* Região viva: a mudança de estado precisa CHEGAR a quem não vê a
              tela. `polite` para não interromper a leitura em curso. */}
          <p
            aria-live="polite"
            className="text-fg-muted text-[length:var(--text-caption-size)]"
          >
            {erro
              ? erro
              : proximaEm !== null
                ? `Próxima verificação em ${String(proximaEm).padStart(2, "0")}s`
                : ""}
          </p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        leadingIcon={IconRefresh}
        isLoading={conferindo}
        onClick={conferir}
      >
        Verificar agora
      </Button>
    </div>
  );
}
