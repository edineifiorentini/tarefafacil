"use client";

import { IconCircleCheck } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { dataHoraBR, dataPuraBR } from "@/lib/utils/fuso";

/**
 * O pagamento confirmado.
 *
 * **Some tudo que servia para pagar** — QR, código, contador, botão de
 * verificar, validade. Deixar o código na tela depois de confirmado é
 * convite para pagar duas vezes, e já aconteceu de o cliente pagar o código
 * antigo e o novo (é por isso que o webhook registra pagamento repetido).
 *
 * NÃO tem "ver comprovante", e a ausência é decisão. A EFI não devolve
 * comprovante nenhum — medido em 9/set/2026: `/v2/cob/{txid}` traz status,
 * valor e horário, e nada parecido com um documento. Gerar aqui um PDF que
 * se pareça com recibo bancário seria fabricar prova. O que a tela mostra
 * são os dados reais, e quem precisa de comprovante pega no próprio banco.
 */
export function PaymentSuccessCard({
  valorCents,
  pagaEm,
  periodo,
  acessoAte,
  referencia,
}: {
  valorCents: number;
  pagaEm: string | null;
  periodo: { inicio: string; fim: string };
  acessoAte: string | null;
  referencia: string;
}) {
  return (
    <section
      // A mudança de estado precisa CHEGAR a quem não vê a tela. `polite`
      // porque interromper a leitura em curso para dar uma boa notícia é
      // pior que esperar a frase terminar.
      aria-live="polite"
      className="border-line bg-card flex flex-col gap-5 rounded-md border p-4 sm:p-6"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-positive-bg text-positive flex h-14 w-14 items-center justify-center rounded-full motion-safe:[animation:tf-fade-in_var(--dur-slow)_var(--ease-out)]">
          <IconCircleCheck size={30} stroke={1.75} aria-hidden />
        </span>

        <Badge variant="positive">Pagamento confirmado</Badge>

        <div>
          <h3 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
            Pix recebido
          </h3>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Seu pagamento de {reais(valorCents)} foi confirmado.
          </p>
        </div>
      </div>

      <dl className="border-line grid grid-cols-1 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2">
        <Dado rotulo="Pago em" valor={pagaEm ? dataHoraBR(pagaEm) : "—"} />
        <Dado
          rotulo="Período"
          valor={`${dataPuraBR(periodo.inicio)} a ${dataPuraBR(periodo.fim)}`}
        />
        <Dado rotulo="Forma de pagamento" valor="Pix" />
        <Dado
          rotulo="Acesso liberado até"
          valor={acessoAte ? dataPuraBR(acessoAte) : "—"}
        />
      </dl>

      <div className="border-line flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Referência {referencia}
        </p>
        <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
          Seu plano já está ativo. Nenhuma outra ação é necessária.
        </p>
      </div>
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-fg-muted text-[length:var(--text-caption-size)]">
        {rotulo}
      </dt>
      <dd className="text-fg text-[length:var(--text-small-size)] font-medium">
        {valor}
      </dd>
    </div>
  );
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
