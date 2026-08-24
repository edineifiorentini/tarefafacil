"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GatewayStatus } from "@/lib/payments/store";
import type { Environment, ProviderId } from "@/lib/payments/provider";

const PAYMENTS_KEY = ["payments-status"] as const;

export type PaymentsStatus = {
  configured: boolean;
  gateways: GatewayStatus[];
};

export function usePaymentsStatus() {
  return useQuery<PaymentsStatus>({
    queryKey: PAYMENTS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/payments/status");
      if (!res.ok) throw new Error("Falha ao ler contas de recebimento");
      return res.json();
    },
    staleTime: 60_000,
  });
}

/** Mensagem já pronta para a tela, vinda do provedor ou do formato. */
export class ConnectError extends Error {}

/**
 * Conectar não é otimista de propósito.
 *
 * A regra 6 diz que a interface não espera o servidor — vale para o que o
 * servidor vai aceitar. Aqui quem decide se a credencial vale é o Mercado
 * Pago ou o Asaas, e mostrar "conectado" antes da resposta seria mentir na
 * metade das tentativas.
 */
export function useConnectPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      provider: ProviderId;
      token: string;
      environment: Environment;
    }) => {
      const res = await fetch("/api/payments/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const corpo = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new ConnectError(
          corpo.message ??
            (corpo.error === "sem_cifra"
              ? "Este ambiente não está preparado para guardar credenciais"
              : corpo.error === "forbidden"
                ? "Só quem administra a empresa conecta conta de recebimento"
                : "Não foi possível salvar agora")
        );
      }
      return (await res.json()) as { label: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}

export function useDisconnectPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (provider: ProviderId) => {
      const res = await fetch("/api/payments/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("disconnect_failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}
