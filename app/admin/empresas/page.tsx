import { IconBuilding } from "@tabler/icons-react";
import Link from "next/link";

import { CompanyFilters } from "@/components/admin/companies/CompanyFilters";
import { CreateClientDialog } from "@/components/admin/companies/CreateClientDialog";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { listCompanies } from "@/lib/admin/companies";
import {
  filtrarEmpresas,
  type FiltrosDeEmpresa,
} from "@/lib/admin/company-filters";
import { STATUS_META, type StatusEmpresa } from "@/lib/admin/status";
import type { PlanRow } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsBRL } from "@/lib/finance/money";
import { tempoRelativo } from "@/lib/utils/relative-time";

export const metadata = { title: "Empresas · Plataforma" };
export const dynamic = "force-dynamic";

/**
 * Listagem de empresas (especificação 9.1).
 *
 * REESCRITA. A versão anterior era a tabela com um seletor de plano, um campo
 * de assentos e um botão "Salvar" em CADA linha — o que a seção 3 da
 * especificação chama de pior problema do painel: edição direta sem contexto,
 * sem validação e sem histórico.
 *
 * Agora a lista é só leitura e cada linha leva ao detalhe, onde as mesmas
 * alterações acontecem com motivo obrigatório e auditoria. Nenhuma capacidade
 * foi perdida: plano, assentos, acesso, suspensão, teste, contato e acesso de
 * suporte estão todos lá, e agora ficam registrados.
 *
 * E os filtros passaram a existir de verdade. Os seis alertas da visão geral
 * já linkavam para cá com `?status=`, `?vencendo=1`, `?atividade=parada` — e
 * esta página ignorava todos. Clicar em "Testes vencendo 2" abria a lista
 * inteira.
 */

function statusValido(v: string | undefined): StatusEmpresa | undefined {
  return v && v in STATUS_META ? (v as StatusEmpresa) : undefined;
}

export default async function AdminEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;

  const filtros: FiltrosDeEmpresa = {
    q: p.q?.trim() || undefined,
    status: statusValido(p.status),
    vencendo: p.vencendo === "1",
    atividade: p.atividade === "parada" ? "parada" : undefined,
    assentos: p.assentos === "limite" ? "limite" : undefined,
    convites: p.convites === "expirados" ? "expirados" : undefined,
  };

  const db = createAdminClient();
  const [todas, planosRes] = await Promise.all([
    listCompanies(),
    db
      .from("billing_plan")
      .select("id, name, price_cents, max_users, is_public, active, notes")
      .order("price_cents", { ascending: true }),
  ]);

  const empresas = filtrarEmpresas(todas, filtros);

  // `PlanRow` pede `workspace_count`, que só a rota de planos calcula. Aqui o
  // diálogo de cadastro usa apenas id, nome e limite — o resto vai zerado em
  // vez de uma segunda consulta agregada só para preencher um campo que este
  // formulário não mostra.
  const planos: PlanRow[] = (
    (planosRes.data ?? []) as Omit<PlanRow, "workspace_count">[]
  ).map((x) => ({ ...x, workspace_count: 0 }));

  const filtrando = Object.values(filtros).some(Boolean);

  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Empresas"
        subtitle="Contas cadastradas, plano, assentos e acesso."
        actions={
          <CreateClientDialog
            key={p.novo === "1" ? "novo" : "lista"}
            plans={planos}
            abrirDireto={p.novo === "1"}
          />
        }
      />

      <CompanyFilters
        filtros={filtros}
        total={todas.length}
        exibidas={empresas.length}
      />

      {empresas.length === 0 ? (
        <EmptyState
          icon={IconBuilding}
          title={
            filtrando
              ? "Nenhuma empresa para estes filtros"
              : "Nenhuma empresa cadastrada"
          }
          description={
            filtrando
              ? "Remova um filtro ou limpe todos para ver a lista inteira."
              : "Use “Cadastrar cliente” para criar a primeira."
          }
        />
      ) : (
        <div className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] border-collapse">
              <caption className="sr-only">
                Empresas cadastradas, da mais recente à mais antiga
              </caption>
              <thead>
                <tr className="border-line border-b">
                  {[
                    "Empresa",
                    "Responsável",
                    "Situação",
                    "Plano",
                    "Membros",
                    "Último acesso",
                    "Atividade",
                    "Receita",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => {
                  const cheio = e.seatLimit > 0 && e.membros >= e.seatLimit;
                  return (
                    <tr
                      key={e.id}
                      className="border-line hover:bg-hover border-b last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/empresas/${e.id}`}
                          className="text-fg rounded-sm text-[length:var(--text-small-size)] font-medium outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                        >
                          {e.nome}
                        </Link>
                        {e.origem ? (
                          <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                            via {e.origem}
                          </span>
                        ) : null}
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {e.responsavel ?? "—"}
                        {e.convitesExpirados > 0 ? (
                          <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                            {e.convitesExpirados} convite
                            {e.convitesExpirados === 1 ? "" : "s"} expirado
                            {e.convitesExpirados === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip
                          label={STATUS_META[e.status].label}
                          tone={STATUS_META[e.status].tone}
                        />
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {e.planoNome ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`tnum text-[length:var(--text-small-size)] ${
                            cheio
                              ? "text-[var(--negative)]"
                              : "text-fg-secondary"
                          }`}
                        >
                          {e.membros}
                          <span className="text-fg-muted">
                            {" "}
                            de {e.seatLimit}
                          </span>
                        </span>
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {tempoRelativo(e.ultimoAcesso)}
                      </td>
                      <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                        {tempoRelativo(e.ultimaAtividade)}
                      </td>
                      <td className="tnum text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                        {formatCentsBRL(e.mrrCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
