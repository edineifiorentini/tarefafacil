import { IconFileDescription } from "@tabler/icons-react";

import { AuditFilters } from "@/components/admin/audit/AuditFilters";
import { AuditTable } from "@/components/admin/audit/AuditTable";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AUDITORIA_POR_PAGINA,
  listAudit,
  type EscopoAuditoria,
} from "@/lib/admin/audit";
import type { AuditAction } from "@/types/database";

export const metadata = { title: "Auditoria · Plataforma" };
export const dynamic = "force-dynamic";

function escopoDe(v: string | undefined): EscopoAuditoria {
  return v === "plataforma" || v === "empresas" ? v : "tudo";
}

function acaoDe(v: string | undefined): AuditAction | undefined {
  return v === "criou" || v === "alterou" || v === "excluiu" ? v : undefined;
}

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    escopo?: string;
    acao?: string;
    q?: string;
    p?: string;
  }>;
}) {
  const params = await searchParams;
  const escopo = escopoDe(params.escopo);
  const acao = acaoDe(params.acao);
  const q = params.q?.trim() || undefined;
  const pagina = Math.max(0, Number(params.p) || 0);

  const { eventos, temMais } = await listAudit({
    escopo,
    acao,
    q,
    offset: pagina * AUDITORIA_POR_PAGINA,
  });

  const filtrando = escopo !== "tudo" || !!acao || !!q;

  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Auditoria"
        subtitle="Quem fez o quê, quando e em qual empresa."
      />

      <AuditFilters escopo={escopo} acao={acao} q={q ?? ""} />

      {eventos.length === 0 ? (
        <EmptyState
          icon={IconFileDescription}
          title={
            filtrando
              ? "Nenhum evento para estes filtros"
              : "Nenhum evento ainda"
          }
          description={
            filtrando
              ? "Ajuste o escopo, a ação ou o termo buscado."
              : "As ações administrativas aparecem aqui assim que acontecerem."
          }
        />
      ) : (
        <AuditTable eventos={eventos} pagina={pagina} temMais={temMais} />
      )}
    </div>
  );
}
