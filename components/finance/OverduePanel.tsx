"use client";

import {
  IconChevronDown,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useState } from "react";

import { formatCentsBRL } from "@/lib/finance/money";
import { daysOverdue, type OverdueGroup } from "@/lib/finance/stats";
import type { FinanceEntry } from "@/types/database";

function atrasoLabel(dias: number): string {
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "mais de 1 mês" : `mais de ${meses} meses`;
}

function Bloco({
  titulo,
  vazio,
  grupo,
  now,
  tone,
  icon: Icon,
  onOpen,
}: {
  titulo: string;
  vazio: string;
  grupo: OverdueGroup;
  now: Date;
  tone: "receber" | "pagar";
  icon: typeof IconTrendingUp;
  onOpen?: (entry: FinanceEntry) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const quantos = grupo.entries.length;

  return (
    <section className="border-line bg-card rounded-md border">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        disabled={quantos === 0}
        className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <Icon
          size={18}
          stroke={1.75}
          aria-hidden
          className={
            quantos > 0 ? "text-overdue shrink-0" : "text-fg-muted shrink-0"
          }
        />
        <span className="text-fg flex-1 text-[length:var(--text-small-size)] font-medium">
          {titulo}
        </span>
        {quantos > 0 ? (
          <span className="tnum text-overdue text-[length:var(--text-small-size)] font-semibold">
            {formatCentsBRL(grupo.cents)}
          </span>
        ) : null}
        <span
          className={`tnum inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[length:var(--text-caption-size)] font-medium ${
            quantos > 0
              ? "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-fg)]"
              : "bg-sunken text-fg-muted"
          }`}
        >
          {quantos}
        </span>
        {quantos > 0 ? (
          <IconChevronDown
            size={16}
            stroke={1.75}
            aria-hidden
            className={`text-fg-muted shrink-0 transition-transform [transition-duration:var(--dur-fast)] ${
              aberto ? "rotate-180" : ""
            }`}
          />
        ) : null}
      </button>

      {quantos === 0 ? (
        <p className="text-fg-muted px-4 pb-3 text-[length:var(--text-caption-size)]">
          {vazio}
        </p>
      ) : aberto ? (
        <ul className="border-line border-t">
          {grupo.entries.map((e) => (
            <li key={e.id} className="border-line border-b last:border-0">
              <button
                type="button"
                onClick={() => onOpen?.(e)}
                disabled={!onOpen}
                className="hover:bg-hover flex w-full items-center gap-3 px-4 py-2 text-left transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="text-fg min-w-0 flex-1 truncate text-[length:var(--text-small-size)]">
                  {e.description}
                </span>
                <span className="text-overdue shrink-0 text-[length:var(--text-caption-size)]">
                  {atrasoLabel(daysOverdue(e, now))}
                </span>
                <span
                  className={`tnum shrink-0 text-[length:var(--text-small-size)] ${
                    tone === "receber" ? "text-fg" : "text-fg-secondary"
                  }`}
                >
                  {formatCentsBRL(e.amount_cents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * O que já venceu, dos dois lados.
 *
 * Fica FORA do recorte de mês da tela: conta de março que ninguém pagou
 * continua vencida em agosto, e é justamente ela que some quando o painel só
 * olha o mês corrente. Recolhido por padrão — a lista importa quando há
 * algo nela, e o número no cabeçalho já diz se há.
 */
export function OverduePanel({
  aReceber,
  aPagar,
  now,
  onOpen,
}: {
  aReceber: OverdueGroup;
  aPagar: OverdueGroup;
  now: Date;
  onOpen?: (entry: FinanceEntry) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Bloco
        titulo="Recebimentos vencidos"
        vazio="Nenhum recebimento vencido."
        grupo={aReceber}
        now={now}
        tone="receber"
        icon={IconTrendingUp}
        onOpen={onOpen}
      />
      <Bloco
        titulo="Pagamentos vencidos"
        vazio="Nenhum pagamento vencido."
        grupo={aPagar}
        now={now}
        tone="pagar"
        icon={IconTrendingDown}
        onOpen={onOpen}
      />
    </div>
  );
}
