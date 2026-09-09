"use client";

import {
  IconCalendarEvent,
  IconCircleCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { PixCheckout } from "@/components/billing/PixCheckout";
import { PlanChooser } from "@/components/billing/PlanChooser";
import { daysLeft } from "@/components/billing/TrialBanner";
import { formatCentsBRL } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/client";
import { usePaymentStatus } from "@/lib/queries/usePaymentStatus";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { BillingPlan } from "@/types/database";

function dataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Linha({
  icon: Icon,
  rotulo,
  valor,
  nota,
  chip,
  tom,
}: {
  icon: typeof IconSparkles;
  rotulo: string;
  valor: string;
  /** Uma frase de apoio. O chip é curto demais para explicar um estado. */
  nota?: string;
  chip?: string;
  tom?: "alerta";
}) {
  return (
    <div className="border-line flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0">
      <Icon
        size={18}
        stroke={1.75}
        aria-hidden
        className={
          tom === "alerta" ? "text-overdue shrink-0" : "text-fg-muted shrink-0"
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          {rotulo}
        </p>
        <p className="text-fg text-[length:var(--text-small-size)] font-medium">
          {valor}
        </p>
        {nota ? (
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {nota}
          </p>
        ) : null}
      </div>
      {chip ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium ${
            tom === "alerta"
              ? "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-fg)]"
              : "bg-sunken text-fg-secondary"
          }`}
        >
          {chip}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A assinatura desta empresa, para o dono ver sem precisar perguntar.
 *
 * Enquanto a cobrança do EFI não existe, esta tela não cobra nem bloqueia:
 * ela mostra a situação e registra qual plano a pessoa quer. É honesta
 * quanto a isso — prometer boleto numa tela que não emite boleto seria pior
 * do que não ter a tela.
 */
export function SubscriptionCard() {
  const workspace = useWorkspace();
  // Mesma chave de consulta do checkout: uma requisição só, cache
  // compartilhado. Duas chaves para o mesmo dado fariam o resumo e o
  // pagamento discordarem a cada nove segundos.
  const { assinatura } = usePaymentStatus();
  const supabase = createClient();

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
          Assinatura
        </h2>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Situação da sua empresa no TAFLOW.
        </p>
      </div>

      <div className="border-line bg-card rounded-md border">
        {/* **A situação vem do SERVIDOR**, e essa é a correção.
            Aqui a linha era `suspended ? "Bloqueada" : teste ? "Em teste" :
            "Ativa"` — "Ativa" era o que sobrava, e empresa com acesso
            vencido há dez dias lia "Ativa" do mesmo jeito. O navegador não
            tem como fazer essa conta: a RLS de `subscription` só responde ao
            dono, então quem sabe se a assinatura foi cancelada é o servidor.
            Ele devolve o ESTADO e nunca o valor (0049). */}
        <Linha
          icon={IconCircleCheck}
          rotulo="Situação"
          valor={assinatura?.rotulo ?? "—"}
          nota={assinatura?.explicacao ?? undefined}
          chip={emTeste ? "Teste grátis" : undefined}
          tom={
            assinatura?.tom === "critico" || assinatura?.tom === "atencao"
              ? "alerta"
              : undefined
          }
        />

        <Linha
          icon={IconSparkles}
          rotulo="Plano"
          valor={plano ? plano.name : "Nenhum plano escolhido"}
          chip={
            plano
              ? plano.price_cents === 0
                ? "Grátis"
                : `${formatCentsBRL(plano.price_cents)} por mês`
              : undefined
          }
        />

        {emTeste && workspace.trial_ends_at ? (
          <Linha
            icon={IconCalendarEvent}
            rotulo={acabou ? "Teste terminou em" : "Teste vai até"}
            valor={dataLonga(workspace.trial_ends_at)}
            chip={
              acabou
                ? "Terminou"
                : dias === 1
                  ? "Último dia"
                  : `Faltam ${dias} dias`
            }
            tom={acabou || dias === 1 ? "alerta" : undefined}
          />
        ) : null}

        {workspace.access_expires_at ? (
          <Linha
            icon={IconCalendarEvent}
            rotulo="Acesso liberado até"
            valor={dataLonga(workspace.access_expires_at)}
          />
        ) : null}
      </div>

      {/* O checkout diz o que É verdade AGORA, e ele mesmo se cala quando
          não há o que cobrar: plano vitalício, plano gratuito, período já
          pago ou provedor desligado cada um tem sua frase. Antes havia aqui
          um aviso fixo dizendo que a cobrança não existia — ele era honesto
          enquanto era verdade, e virou mentira no dia em que passou a
          existir. Texto fixo sobre estado que muda é dívida com juros. */}
      <PixCheckout />

      <PlanChooser />
    </section>
  );
}
