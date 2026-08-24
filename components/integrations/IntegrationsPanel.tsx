"use client";

import { GcalConnectAction } from "@/components/gcal/GcalConnectAction";
import { Skeleton } from "@/components/ui/Skeleton";
import type { IntegrationId } from "@/lib/integrations/catalog";
import { INTEGRATION_GROUPS } from "@/lib/integrations/catalog";
import { useGcalStatus } from "@/lib/queries/useGcal";

import { IntegrationCard } from "./IntegrationCard";

/**
 * Grade de integrações, agrupada por assunto.
 *
 * Mostra também o que ainda não existe, marcado como "em breve". É promessa,
 * e promessa cobra: cada cartão desses corresponde a um item do roadmap com
 * dono e motivo. Não entra nada aqui para encher a tela.
 *
 * A ação de cada integração é um componente próprio — o painel não sabe
 * conectar nada, só sabe onde encaixar quem sabe.
 */
const ACTIONS: Partial<Record<IntegrationId, React.ReactNode>> = {
  "google-agenda": <GcalConnectAction />,
};

export function IntegrationsPanel() {
  const { data: gcal, isLoading } = useGcalStatus();

  const conectadas = new Set<IntegrationId>();
  if (gcal?.connected) conectadas.add("google-agenda");

  if (isLoading) {
    return <Skeleton variant="block" className="h-64" />;
  }

  return (
    <div className="flex flex-col gap-6">
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
                {ACTIONS[item.id]}
              </IntegrationCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
