import Link from "next/link";
import {
  IconAlertTriangle,
  IconCalendarOff,
  IconCoin,
  IconCreditCard,
  IconTestPipe,
} from "@tabler/icons-react";

import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";
import { SubscriptionActions } from "@/components/admin/subscriptions/SubscriptionActions";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { ESTADO_META, listSubscriptions } from "@/lib/admin/subscriptions";
import { formatCentsBRL } from "@/lib/finance/money";
import { tempoRelativo } from "@/lib/utils/relative-time";

export const metadata = { title: "Assinaturas · Plataforma" };
export const dynamic = "force-dynamic";

function data(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminAssinaturasPage() {
  const { assinaturas, indicadores } = await listSubscriptions();

  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Assinaturas"
        subtitle="Ciclo financeiro das contas."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={IconCreditCard}
          label="Ativas"
          value={String(indicadores.ativas)}
          tone="var(--positive)"
          hint="Assinaturas em dia, sem cancelamento agendado, de empresas que não estão suspensas nem vencidas."
        />
        <MetricCard
          icon={IconCoin}
          label="MRR"
          value={formatCentsBRL(indicadores.mrrCents)}
          tone="var(--chart-1)"
          hint="Soma do preço mensal das assinaturas ativas. Cancelamento agendado fica de fora: ainda paga este mês, mas já tem data para acabar."
        />
        <MetricCard
          icon={IconTestPipe}
          label="Em teste"
          value={String(indicadores.testes)}
          tone="var(--chart-2)"
          hint="Empresas no período de avaliação. Não entram no MRR."
        />
        <MetricCard
          icon={IconAlertTriangle}
          label="Inadimplentes"
          value={String(indicadores.inadimplentes + indicadores.pendentes)}
          tone="var(--negative)"
          hint="Assinaturas vencidas somadas às com pagamento pendente — as duas exigem ação de cobrança."
        />
        <MetricCard
          icon={IconCalendarOff}
          label="Cancelam em breve"
          value={String(indicadores.cancelamentosAgendados)}
          tone="var(--status-due-soon-fg)"
          hint="Assinaturas com data marcada para terminar. Ainda valem até lá."
        />
      </div>

      {/* O aviso é a informação mais importante desta tela enquanto for
          verdade — sem ele, "próxima cobrança" pareceria uma promessa. */}
      <div className="border-line bg-subtle rounded-md border px-4 py-3 text-[length:var(--text-small-size)]">
        <strong className="text-fg font-medium">
          Nenhuma cobrança é gerada automaticamente ainda.
        </strong>{" "}
        <span className="text-fg-secondary">
          O motor de ciclo existe e está testado, mas nada o chama: não há
          cobranças emitidas nem pagamentos registrados. &quot;Próxima
          cobrança&quot; é o cálculo do ciclo a partir do dia escolhido, não uma
          fatura existente. Por isso não há nova tentativa de cobrança, reenvio
          de link nem reembolso nesta tela.
        </span>
      </div>

      <section
        aria-labelledby="lista-assinaturas"
        className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]"
      >
        <h2 id="lista-assinaturas" className="sr-only">
          Assinaturas
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] border-collapse">
            <thead>
              <tr className="border-line border-b">
                {[
                  "Empresa",
                  "Estado",
                  "Plano",
                  "Valor",
                  "Dia",
                  "Próxima cobrança",
                  "Última paga",
                  "Origem",
                  "",
                ].map((h, i) => (
                  <th
                    key={h || `acoes-${i}`}
                    scope="col"
                    className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium"
                  >
                    {h || <span className="sr-only">Ações</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assinaturas.map((a) => (
                <tr
                  key={a.workspaceId}
                  className="border-line hover:bg-hover border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/empresas/${a.workspaceId}`}
                      className="text-fg rounded-sm text-[length:var(--text-small-size)] font-medium outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      {a.empresa}
                    </Link>
                    {a.bloqueada ? (
                      <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                        empresa sem acesso
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={ESTADO_META[a.estado].label}
                      tone={ESTADO_META[a.estado].tone}
                    />
                    {a.cancelaEm ? (
                      <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                        em {data(a.cancelaEm)}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {a.planoNome ?? "—"}
                  </td>
                  <td className="tnum text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                    {a.valorCents > 0 ? formatCentsBRL(a.valorCents) : "—"}
                  </td>
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {a.diaDeCobranca > 0 ? a.diaDeCobranca : "—"}
                  </td>
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {data(a.proximaCobranca)}
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {a.ultimaCobranca ? tempoRelativo(a.ultimaCobranca) : "—"}
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {a.origem ?? "Direto"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SubscriptionActions
                      workspaceId={a.workspaceId}
                      empresa={a.empresa}
                      estado={a.estado}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
