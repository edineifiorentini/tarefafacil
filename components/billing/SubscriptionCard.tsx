"use client";

import { useRef } from "react";

import { IconCalendarEvent } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { BillingHistory } from "@/components/billing/BillingHistory";
import { PixCheckout } from "@/components/billing/PixCheckout";
import { PlanChooser } from "@/components/billing/PlanChooser";
import { SubscriptionSummary } from "@/components/billing/SubscriptionSummary";
import { daysLeft } from "@/components/billing/TrialBanner";
import { usePaymentStatus } from "@/lib/queries/usePaymentStatus";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { createClient } from "@/lib/supabase/client";
import { dataLongaDeInstanteBR } from "@/lib/utils/fuso";
import type { BillingPlan } from "@/types/database";

/**
 * Assinatura e pagamentos, do jeito que quem paga precisa ver.
 *
 * Este componente COMPÕE e quase não desenha: o resumo, o pagamento, a
 * escolha de plano e o histórico são cada um o seu arquivo. Foi assim que a
 * mesma tela passou a servir "aguardando" e "confirmado" sem virar dois
 * caminhos para manter em sincronia.
 *
 * A `dataLonga` que morava aqui tratava as DUAS datas como instante — e
 * `access_expires_at` guarda uma data civil escrita como texto. O acesso
 * aparecia vencendo um dia antes do que valia. As duas funções certas moram
 * hoje em `lib/utils/fuso.ts`, com o porquê ao lado.
 */
export function SubscriptionCard() {
  const workspace = useWorkspace();
  // Mesma chave de consulta do checkout: uma requisição só, cache
  // compartilhado. Duas chaves para o mesmo dado fariam o resumo e o
  // pagamento discordarem a cada nove segundos.
  const { assinatura, proximaRenovacao } = usePaymentStatus();
  const supabase = createClient();
  const planos = useRef<HTMLDivElement | null>(null);

  const { data: plano } = useQuery({
    enabled: !!workspace.plan_id,
    queryKey: ["plan", workspace.plan_id],
    queryFn: async (): Promise<BillingPlan | null> => {
      const { data } = await supabase
        .from("billing_plan")
        .select("*")
        .eq("id", workspace.plan_id as string)
        .maybeSingle();
      return data;
    },
  });

  const emTeste = workspace.trial && !!workspace.trial_ends_at;
  const dias = workspace.trial_ends_at
    ? daysLeft(workspace.trial_ends_at, new Date())
    : null;
  const acabou = dias !== null && dias <= 0;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
          Assinatura e pagamentos
        </h2>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Gerencie seu plano, cobranças e formas de pagamento.
        </p>
      </div>

      <SubscriptionSummary
        assinatura={assinatura}
        proximaRenovacao={proximaRenovacao}
        plano={plano ?? null}
        // Leva até a escolha de plano, que é onde a troca acontece de
        // verdade. Um botão abrindo outro caminho para a mesma decisão
        // criaria dois lugares para mantê-la.
        aoGerenciar={() =>
          planos.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {/* O teste tem prazo próprio e fica FORA do resumo: ele é temporário,
          e os três blocos de cima valem para a vida inteira da conta. */}
      {emTeste && workspace.trial_ends_at ? (
        <div className="border-line bg-card flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
          <IconCalendarEvent
            size={18}
            stroke={1.75}
            aria-hidden
            className={
              acabou ? "text-overdue shrink-0" : "text-fg-muted shrink-0"
            }
          />
          <div className="min-w-0 flex-1">
            <p className="text-fg-muted text-[length:var(--text-caption-size)]">
              {acabou ? "Teste terminou em" : "Teste vai até"}
            </p>
            <p className="text-fg text-[length:var(--text-small-size)] font-medium">
              {/* `trial_ends_at` é instante de verdade — precisa do fuso. */}
              {dataLongaDeInstanteBR(workspace.trial_ends_at)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium ${
              acabou || dias === 1
                ? "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-fg)]"
                : "bg-sunken text-fg-secondary"
            }`}
          >
            {acabou
              ? "Terminou"
              : dias === 1
                ? "Último dia"
                : `Faltam ${dias} dias`}
          </span>
        </div>
      ) : null}

      {/* O checkout diz o que É verdade AGORA, e ele mesmo se cala quando
          não há o que cobrar: plano vitalício, plano gratuito, período já
          pago ou provedor desligado cada um tem sua frase. Antes havia aqui
          um aviso fixo dizendo que a cobrança não existia — ele era honesto
          enquanto era verdade, e virou mentira no dia em que passou a
          existir. Texto fixo sobre estado que muda é dívida com juros. */}
      <PixCheckout />

      <div ref={planos}>
        <PlanChooser />
      </div>

      <BillingHistory />
    </section>
  );
}
