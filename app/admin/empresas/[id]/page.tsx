import Link from "next/link";
import { notFound } from "next/navigation";

import { IconArrowLeft } from "@tabler/icons-react";

import { CompanyActions } from "@/components/admin/company/CompanyActions";
import { CompanyTabs } from "@/components/admin/company/CompanyTabs";
import { ADMIN_CONTAINER } from "@/components/admin/shell/AdminPageHeader";
import { CopyId } from "@/components/admin/company/CopyId";
import { StatusChip } from "@/components/ui/StatusChip";
import { getCompany, DIAS_ATE_REMOCAO_FISICA } from "@/lib/admin/company";
import { STATUS_META } from "@/lib/admin/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresa = await getCompany(id);
  return { title: empresa ? `${empresa.nome} · Plataforma` : "Empresa" };
}

export default async function AdminEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresa = await getCompany(id);
  if (!empresa) notFound();

  const db = createAdminClient();
  const { data: planos } = await db
    .from("billing_plan")
    .select("id, name, max_users")
    .eq("active", true)
    .order("price_cents", { ascending: true });

  return (
    <div className={ADMIN_CONTAINER}>
      <Link
        href="/admin/empresas"
        className="text-fg-secondary hover:text-fg flex w-fit items-center gap-1.5 rounded-sm text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <IconArrowLeft size={16} stroke={1.75} aria-hidden />
        Empresas
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-fg text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold tracking-tight">
              {empresa.nome}
            </h1>
            <StatusChip
              label={STATUS_META[empresa.status].label}
              tone={STATUS_META[empresa.status].tone}
            />
            {empresa.excluidaEm ? (
              <StatusChip label="Excluída" tone="var(--negative)" />
            ) : null}
          </div>
          <div className="text-fg-secondary flex flex-wrap items-center gap-x-4 gap-y-1 text-[length:var(--text-small-size)]">
            <span>{empresa.planoNome ?? "Sem plano"}</span>
            <span>{empresa.dono?.email ?? "Sem dono atribuído"}</span>
            <CopyId id={empresa.id} />
          </div>
        </div>

        <CompanyActions
          empresaId={empresa.id}
          empresaNome={empresa.nome}
          suspensa={empresa.suspensa}
          excluida={!!empresa.excluidaEm}
          emTeste={empresa.emTeste}
          planoId={empresa.planoId}
          assentos={empresa.seatLimit}
          contatoEmail={empresa.contatoEmail}
          contatoTelefone={empresa.contatoTelefone}
          planos={
            (planos ?? []) as { id: string; name: string; max_users: number }[]
          }
        />
      </header>

      {empresa.excluidaEm ? (
        <div
          role="status"
          className="border-line bg-subtle rounded-md border px-4 py-3 text-[length:var(--text-small-size)]"
        >
          <strong className="text-fg font-medium">
            Empresa excluída há {empresa.diasExcluida}{" "}
            {empresa.diasExcluida === 1 ? "dia" : "dias"}.
          </strong>{" "}
          <span className="text-fg-secondary">
            Os dados continuam guardados e a empresa pode ser restaurada. A
            remoção definitiva só é possível depois de {DIAS_ATE_REMOCAO_FISICA}{" "}
            dias neste estado.
          </span>
        </div>
      ) : null}

      <CompanyTabs empresa={empresa} />
    </div>
  );
}
