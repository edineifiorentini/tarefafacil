"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { PainelDeCobranca } from "@/lib/billing/painel";
import {
  CHAVE_DA_COBRANCA,
  usePaymentStatus,
} from "@/lib/queries/usePaymentStatus";

import { PaymentSuccessCard } from "./PaymentSuccessCard";
import { PixPaymentCard } from "./PixPaymentCard";

/**
 * O pagamento visto por quem paga.
 *
 * Este componente decide QUAL estado mostrar e não desenha nenhum deles —
 * cada um tem o seu arquivo. É o que mantém "aguardando" e "confirmado"
 * como dois estados da MESMA cobrança, em vez de duas telas que precisam
 * ser mantidas em sincronia.
 *
 * O servidor é quem diz o estado. O navegador consulta, exibe e oferece as
 * ações — em momento nenhum ele decide que algo foi pago.
 */
export function PixCheckout() {
  const toast = useToast();
  const qc = useQueryClient();
  const {
    estado,
    carregando,
    proximaEm,
    conferir,
    conferindo,
    erroAoConferir,
  } = usePaymentStatus();

  const gerar = useMutation({
    mutationFn: async (): Promise<PainelDeCobranca> => {
      const res = await fetch("/api/billing/cobranca", { method: "POST" });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Só quem administra a empresa pode gerar a cobrança."
            : "Não foi possível gerar a cobrança."
        );
      }
      return (await res.json()) as PainelDeCobranca;
    },
    onSuccess: (novo) => {
      qc.setQueryData(CHAVE_DA_COBRANCA, novo);
      const c = novo.cobranca;
      if (c.estado === "manual" || c.estado === "sem_cobranca") {
        toast.show({ message: c.motivo });
      }
    },
    onError: (e: Error) => toast.show({ message: e.message }),
  });

  if (carregando) return <Skeleton variant="block" className="h-40" />;
  if (!estado) return null;

  if (estado.estado === "paga") {
    return (
      <PaymentSuccessCard
        valorCents={estado.valorCents}
        pagaEm={estado.pagaEm}
        periodo={estado.periodo}
        acessoAte={estado.acessoAte}
        referencia={estado.referencia}
      />
    );
  }

  if (estado.estado === "aberta") {
    return (
      <PixPaymentCard
        valorCents={estado.valorCents}
        periodo={estado.periodo}
        expiraEm={estado.expiraEm}
        copiaECola={estado.copiaECola}
        qrCode={estado.qrCode}
        proximaEm={proximaEm}
        conferir={conferir}
        conferindo={conferindo}
        erro={erroAoConferir}
      />
    );
  }

  // `sem_cobranca` e `manual`: os dois têm um motivo para mostrar, e a
  // diferença está em haver ou não uma ação possível.
  //
  // **O botão depende do `podeGerar`, não do estado.** Ele aparecia em todo
  // `sem_cobranca`, e num plano vitalício o clique respondia "não há
  // cobrança" — resposta certa para uma pergunta que a tela não devia ter
  // feito. Quem decide é o servidor, que conhece o plano.
  return (
    <div className="border-line bg-card flex flex-col items-start gap-3 rounded-md border p-4">
      <p className="text-fg-secondary text-[length:var(--text-small-size)]">
        {estado.motivo}
      </p>
      {estado.estado === "sem_cobranca" && estado.podeGerar ? (
        <Button
          size="sm"
          isLoading={gerar.isPending}
          onClick={() => gerar.mutate()}
        >
          {/* Renovar não é uma segunda conta: é o mesmo mês com um código
              novo. "Gerar cobrança" aqui faria quem já deve pensar que vai
              dever duas vezes. */}
          {estado.acao === "renovar"
            ? "Gerar novo código Pix"
            : "Gerar cobrança do período"}
        </Button>
      ) : null}
    </div>
  );
}
