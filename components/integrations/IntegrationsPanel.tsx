"use client";

import { useState } from "react";

import { GcalConnectAction } from "@/components/gcal/GcalConnectAction";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Integration, IntegrationId } from "@/lib/integrations/catalog";
import { INTEGRATION_GROUPS } from "@/lib/integrations/catalog";
import { useGcalStatus } from "@/lib/queries/useGcal";
import { usePaymentsStatus } from "@/lib/queries/usePayments";

import { IntegrationCard } from "./IntegrationCard";
import { PaymentConnectPanel } from "./PaymentConnectPanel";

/**
 * Grade de integrações, agrupada por assunto, e o detalhe de cada uma.
 *
 * Mostra também o que ainda não existe, marcado como "em breve". É promessa,
 * e promessa cobra: cada cartão desses corresponde a um item do roadmap. Não
 * entra nada aqui para encher a tela.
 *
 * Duas formas de conectar convivem, e é de propósito: o Google Agenda cabe no
 * cartão (um botão que sai para o consentimento), enquanto conta de
 * recebimento precisa de chave, ambiente e aviso — isso vira tela própria.
 * Forçar as duas no mesmo formato deixaria uma apertada e a outra vazia.
 */
export function IntegrationsPanel() {
  const [aberta, setAberta] = useState<Integration | null>(null);
  const { data: gcal, isLoading: carregandoGcal } = useGcalStatus();
  const { data: pagamentos, isLoading: carregandoPagamentos } =
    usePaymentsStatus();

  if (carregandoGcal || carregandoPagamentos) {
    return <Skeleton variant="block" className="h-64" />;
  }

  const conectadas = new Set<IntegrationId>();
  if (gcal?.connected) conectadas.add("google-agenda");
  for (const grupo of INTEGRATION_GROUPS) {
    for (const item of grupo.items) {
      const ligada = pagamentos?.gateways.some(
        (g) => g.provider === item.paymentProvider && g.active
      );
      if (ligada) conectadas.add(item.id);
    }
  }

  if (aberta?.paymentProvider) {
    return (
      <PaymentConnectPanel
        integration={aberta}
        provider={aberta.paymentProvider}
        atual={pagamentos?.gateways.find(
          (g) => g.provider === aberta.paymentProvider
        )}
        onVoltar={() => setAberta(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pagamentos && !pagamentos.configured ? (
        <p
          role="status"
          className="border-line bg-sunken text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)]"
        >
          Este ambiente ainda não guarda credenciais com segurança, então as
          contas de recebimento estão desligadas. Falta a chave de cifra no
          servidor.
        </p>
      ) : null}

      {INTEGRATION_GROUPS.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-fg font-medium">{group.title}</h2>
            <p className="text-fg-secondary text-[length:var(--text-small-size)]">
              {group.hint}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <IntegrationCard
                key={item.id}
                integration={item}
                connected={conectadas.has(item.id)}
              >
                {item.id === "google-agenda" ? <GcalConnectAction /> : null}

                {item.paymentProvider ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagamentos?.configured}
                    onClick={() => setAberta(item)}
                  >
                    {conectadas.has(item.id) ? "Gerenciar" : "Conectar"}
                  </Button>
                ) : null}
              </IntegrationCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
