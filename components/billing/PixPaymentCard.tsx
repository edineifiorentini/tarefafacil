"use client";

import { Badge } from "@/components/ui/Badge";
import { dataHoraBR, dataPuraBR } from "@/lib/utils/fuso";

import { PaymentPollingStatus } from "./PaymentPollingStatus";
import { PaymentSteps } from "./PaymentSteps";
import { PixCopyField } from "./PixCopyField";
import { PixQrPanel } from "./PixQrPanel";

/**
 * A cobrança aberta, do jeito que quem paga precisa vê-la.
 *
 * Duas colunas no desktop porque as duas formas de pagar têm o mesmo peso:
 * QR para quem está no computador, copia e cola para quem está no celular.
 * Empilha no mobile com o copia e cola PRIMEIRO — lá o QR não serve.
 *
 * **Duas datas diferentes, e nunca no mesmo lugar:** a validade do código
 * (semana) e a próxima verificação (segundos). Misturá-las faz quem lê
 * achar que tem oito segundos para pagar.
 */
export function PixPaymentCard({
  valorCents,
  periodo,
  expiraEm,
  copiaECola,
  qrCode,
  proximaEm,
  conferir,
  conferindo,
  erro,
}: {
  valorCents: number;
  periodo: { inicio: string; fim: string };
  expiraEm: string | null;
  copiaECola: string | null;
  qrCode: string | null;
  proximaEm: number | null;
  conferir: () => void;
  conferindo: boolean;
  erro: string | null;
}) {
  return (
    <section className="border-line bg-card flex flex-col gap-5 rounded-md border p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Badge variant="due-soon">Aguardando pagamento</Badge>
          <p className="text-fg text-[length:var(--text-h2-size)] font-semibold">
            {reais(valorCents)}
          </p>
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            Cobrança de {dataPuraBR(periodo.inicio)} a {dataPuraBR(periodo.fim)}
          </p>
        </div>

        {expiraEm ? (
          <div className="text-right">
            <p className="text-fg-muted text-[length:var(--text-caption-size)]">
              Vencimento
            </p>
            <p className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
              {dataPuraBR(expiraEm.slice(0, 10))}
            </p>
          </div>
        ) : null}
      </header>

      {/* `flex-col-reverse` no mobile: o copia e cola sobe, porque no celular
          o QR é inútil. Mudando só a ORDEM VISUAL — a do DOM segue lógica,
          então teclado e leitor de tela não são afetados. */}
      <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start lg:gap-8">
        {qrCode ? (
          <div className="lg:w-52 lg:shrink-0">
            <PixQrPanel qrCode={qrCode} />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {copiaECola ? <PixCopyField codigo={copiaECola} /> : null}
          <PaymentSteps />
        </div>
      </div>

      <PaymentPollingStatus
        proximaEm={proximaEm}
        conferir={conferir}
        conferindo={conferindo}
        erro={erro}
      />

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Você pode sair desta página. Continuaremos acompanhando o pagamento.
        {expiraEm ? ` Este código vale até ${dataHoraBR(expiraEm)}.` : ""}
      </p>
    </section>
  );
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
