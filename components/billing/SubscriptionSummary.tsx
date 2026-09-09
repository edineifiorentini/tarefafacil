"use client";

import type { ComponentType } from "react";

import {
  IconCalendarEvent,
  IconCircleCheck,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import type { LeituraDaAssinatura, Tom } from "@/lib/billing/situacao";
import { formatCentsBRL } from "@/lib/finance/money";
import { dataLongaPuraBR } from "@/lib/utils/fuso";

/**
 * O resumo da assinatura, em três blocos.
 *
 * Situação, plano e próxima renovação são as três perguntas que alguém abre
 * esta tela para responder, e lado a lado elas se leem de uma vez. A lista
 * vertical que havia aqui obrigava a percorrer para achar cada uma.
 *
 * **Nenhum dos três valores é calculado aqui.** A situação vem do servidor,
 * que é o único que enxerga a assinatura (a RLS de `subscription` só
 * responde ao dono); a data da renovação também. O componente desenha.
 */
export function SubscriptionSummary({
  assinatura,
  proximaRenovacao,
  plano,
  aoGerenciar,
}: {
  assinatura: LeituraDaAssinatura | undefined;
  proximaRenovacao: string | null | undefined;
  plano: { name: string; price_cents: number } | null;
  aoGerenciar: () => void;
}) {
  return (
    <section className="border-line bg-card divide-line flex flex-col divide-y rounded-md border lg:flex-row lg:items-center lg:divide-x lg:divide-y-0">
      <Bloco
        icon={IconCircleCheck}
        rotulo="Situação"
        valor={assinatura?.rotulo ?? "—"}
        nota={assinatura?.explicacao ?? null}
        tom={assinatura?.tom}
      />

      <Bloco
        icon={IconSparkles}
        rotulo="Plano atual"
        valor={plano ? plano.name : "Nenhum plano escolhido"}
        nota={
          plano
            ? plano.price_cents === 0
              ? "Grátis"
              : `${formatCentsBRL(plano.price_cents)} por mês`
            : null
        }
      />

      <Bloco
        icon={IconCalendarEvent}
        rotulo="Próxima renovação"
        // Sem data quando não haverá cobrança. Dizer o motivo é melhor que
        // um traço que a pessoa fica tentando interpretar.
        valor={
          proximaRenovacao ? dataLongaPuraBR(proximaRenovacao) : "Sem renovação"
        }
        nota={proximaRenovacao ? null : "Não há cobrança programada."}
      />

      <div className="shrink-0 p-4">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={IconSettings}
          onClick={aoGerenciar}
        >
          Gerenciar plano
        </Button>
      </div>
    </section>
  );
}

function Bloco({
  icon: Icon,
  rotulo,
  valor,
  nota,
  tom,
}: {
  icon: ComponentType<{
    size?: number;
    stroke?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  rotulo: string;
  valor: string;
  nota: string | null;
  tom?: Tom;
}) {
  const alerta = tom === "critico" || tom === "atencao";

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
      <Icon
        size={18}
        stroke={1.75}
        aria-hidden
        className={
          alerta
            ? "text-overdue mt-0.5 shrink-0"
            : "text-fg-muted mt-0.5 shrink-0"
        }
      />
      <div className="min-w-0">
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          {rotulo}
        </p>
        <p
          className={`text-[length:var(--text-small-size)] font-medium ${
            alerta ? "text-overdue" : "text-fg"
          }`}
        >
          {valor}
        </p>
        {nota ? (
          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            {nota}
          </p>
        ) : null}
      </div>
    </div>
  );
}
