import Link from "next/link";
import {
  IconBuilding,
  IconCoin,
  IconSettings,
  IconTargetArrow,
  IconTrendingDown,
  IconUsers,
} from "@tabler/icons-react";

import { GrowthChartCard } from "@/components/admin/overview/GrowthChartCard";
import { OperationalHealthCard } from "@/components/admin/overview/OperationalHealthCard";
import { PeriodPicker } from "@/components/admin/overview/PeriodPicker";
import { RecentCompaniesTable } from "@/components/admin/overview/RecentCompaniesTable";
import { SystemHealthStrip } from "@/components/admin/overview/SystemHealthStrip";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { recentCompanies } from "@/lib/admin/companies";
import { operationalFooter, operationalHealth } from "@/lib/admin/health";
import { platformMetrics, type Janela } from "@/lib/admin/metrics";
import { formatCentsBRL } from "@/lib/finance/money";

export const metadata = { title: "Administração · Plataforma" };

// Números da plataforma inteira: nunca cacheados entre requisições.
export const dynamic = "force-dynamic";

const CONTAINER =
  "mx-auto flex w-full max-w-[var(--max-width-app)] flex-col gap-[var(--space-block-gap)] px-4 pb-8 lg:px-6";

function janelaDe(valor: string | undefined): Janela {
  const n = Number(valor);
  return n === 7 || n === 90 ? n : 30;
}

function porcento(v: number): string {
  return `${(Math.round(v * 10) / 10).toLocaleString("pt-BR")}%`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;
  const janela = janelaDe(dias);

  const [m, alertas, rodape, empresas] = await Promise.all([
    platformMetrics(janela),
    operationalHealth(),
    operationalFooter(),
    recentCompanies(6),
  ]);

  const comparacao = `vs. ${janela} dias anteriores`;

  return (
    <div className={CONTAINER}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-fg text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold tracking-tight">
            Administração
          </h1>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Saúde, crescimento e operação do seu SaaS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker atual={janela} />

          {/* Estado dos cadastros + atalho para mudar a política (8.1). O
              interruptor em si mora em Configurações: aqui é indicador, não
              um segundo lugar de decidir. */}
          <Link
            href="/admin/configuracoes"
            className="border-line bg-card hover:bg-hover text-fg-secondary flex items-center gap-2 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <StatusChip
              label={
                rodape.cadastrosAbertos
                  ? "Cadastros abertos"
                  : "Cadastros fechados"
              }
              tone={
                rodape.cadastrosAbertos
                  ? "var(--positive)"
                  : "var(--text-muted)"
              }
              variant="dot"
            />
            <IconSettings size={16} stroke={1.75} aria-hidden />
            <span className="sr-only">Configurar política de cadastro</span>
          </Link>
        </div>
      </header>

      {/* Cinco indicadores executivos (especificação 8.3). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={IconBuilding}
          label="Empresas ativas"
          value={String(m.empresasAtivas.valor)}
          tone="var(--chart-1)"
          trend={m.empresasAtivas.variacao ?? undefined}
          trendLabel={comparacao}
          series={m.empresasAtivas.serie}
          hint="Empresas que existem, não estão suspensas e cujo acesso não venceu. Suspensão e vencimento são lidos no estado de hoje — o banco não guarda o histórico desses dois campos, então dias passados erram a favor do presente."
        />
        <MetricCard
          icon={IconUsers}
          label="Usuários ativos"
          value={String(m.usuariosAtivos.valor)}
          tone="var(--chart-2)"
          trend={m.usuariosAtivos.variacao ?? undefined}
          trendLabel={comparacao}
          series={m.usuariosAtivos.serie}
          hint="Pessoas distintas que alteraram alguma demanda na janela. Não é 'abriu o app': quem apenas leu não entra na conta."
        />
        <MetricCard
          icon={IconCoin}
          label="MRR"
          value={formatCentsBRL(m.mrrCents.valor)}
          tone="var(--positive)"
          trend={m.mrrCents.variacao ?? undefined}
          trendLabel={comparacao}
          series={m.mrrCents.serie}
          hint="Soma mensal das assinaturas ativas e pagas. Fora da conta: teste, empresa sem plano e assinatura não ativa. O micrográfico mostra a receita efetivamente paga por dia."
        />
        <MetricCard
          icon={IconTargetArrow}
          label="Conversão do teste"
          value={porcento(m.conversaoTrial.valor)}
          tone="var(--chart-3)"
          trend={m.conversaoTrial.variacao ?? undefined}
          trendLabel={comparacao}
          series={m.conversaoTrial.serie}
          hint="Dos testes que terminaram no período, quantos hoje têm assinatura ativa. Sem nenhum teste vencido na janela, o valor é zero por falta de divisor, não por falta de conversão."
        />
        <MetricCard
          icon={IconTrendingDown}
          label="Churn"
          value={porcento(m.churn.valor)}
          tone="var(--negative)"
          // Churn subindo é notícia ruim: a seta verde precisa apontar
          // para baixo.
          trendInvert
          trend={m.churn.variacao ?? undefined}
          trendLabel={comparacao}
          series={m.churn.serie}
          hint="Assinaturas canceladas no período sobre as pagas no início dele. A data do cancelamento sai de 'última alteração' da assinatura — é aproximação, não carimbo de cancelamento."
        />
      </div>

      {/* Gráfico e alertas lado a lado no desktop (especificação 27). */}
      <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-12">
        <div className="xl:col-span-8">
          <GrowthChartCard dados={m.crescimento} />
        </div>
        <div className="xl:col-span-4">
          <OperationalHealthCard alertas={alertas} />
        </div>
      </div>

      <RecentCompaniesTable empresas={empresas} />

      <SystemHealthStrip dados={rodape} />
    </div>
  );
}
