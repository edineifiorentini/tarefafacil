import { notFound, redirect } from "next/navigation";

import { PrintButton } from "@/components/contracts/PrintButton";
import { formatCentsBRL } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

const BILLING_LABEL: Record<string, string> = {
  unico: "Pagamento único",
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
};

function formatDate(v: string | null): string {
  if (!v) return "—";
  return v.split("-").reverse().join("/");
}

// Fora do grupo (app): visualização de documento, não faz sentido dentro
// da casca do app (sidebar/topbar) — só o conteúdo pra imprimir/exportar
// em PDF pelo diálogo nativo do navegador (Ctrl+P / "Salvar como PDF").
export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/contratos/${id}/imprimir`)}`);
  }

  // RLS já restringe a dono/admin do workspace do contrato.
  const { data: contract } = await supabase
    .from("contract")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!contract) notFound();

  const [{ data: client }, { data: workspace }] = await Promise.all([
    supabase
      .from("client")
      .select("*")
      .eq("id", contract.client_id)
      .maybeSingle(),
    supabase
      .from("workspace")
      .select("*")
      .eq("id", contract.workspace_id)
      .maybeSingle(),
  ]);

  return (
    <div className="bg-page min-h-dvh print:bg-white">
      <PrintButton />

      <article className="bg-card text-fg mx-auto max-w-3xl px-10 py-12 font-serif print:bg-white print:px-0 print:py-0 print:text-black">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-wide uppercase">
            Contrato de prestação de serviços
          </h1>
          {contract.number ? (
            <p className="text-fg-secondary mt-1 print:text-black">
              Nº {contract.number}
            </p>
          ) : null}
        </header>

        <section className="mb-6">
          <h2 className="text-fg-secondary mb-1 text-sm font-semibold tracking-wide uppercase print:text-black">
            Contratante
          </h2>
          <p>{client?.name ?? "Cliente não encontrado"}</p>
          {client?.fantasy_name ? <p>{client.fantasy_name}</p> : null}
          <p>
            {client?.type === "pj" ? "CNPJ" : "CPF"}:{" "}
            {client?.document ?? "não informado"}
          </p>
          <p>
            {client?.email ?? "—"} · {client?.phone ?? "—"}
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-fg-secondary mb-1 text-sm font-semibold tracking-wide uppercase print:text-black">
            Contratado
          </h2>
          <p>{workspace?.name ?? "—"}</p>
        </section>

        <section className="mb-6">
          <h2 className="text-fg-secondary mb-1 text-sm font-semibold tracking-wide uppercase print:text-black">
            Objeto
          </h2>
          <p className="font-medium">{contract.title}</p>
          {contract.description ? (
            <p className="text-fg-secondary mt-1 whitespace-pre-wrap print:text-black">
              {contract.description}
            </p>
          ) : null}
        </section>

        <section className="mb-6">
          <h2 className="text-fg-secondary mb-1 text-sm font-semibold tracking-wide uppercase print:text-black">
            Vigência
          </h2>
          <p>Emissão: {formatDate(contract.issued_on)}</p>
          <p>
            Início: {formatDate(contract.starts_on)} · Fim:{" "}
            {formatDate(contract.ends_on)}
          </p>
          {contract.auto_renew ? (
            <p>
              Renovação automática, com aviso prévio de{" "}
              {contract.renew_notice_days ?? "—"} dias.
            </p>
          ) : null}
        </section>

        <section className="mb-6">
          <h2 className="text-fg-secondary mb-1 text-sm font-semibold tracking-wide uppercase print:text-black">
            Honorários
          </h2>
          <p>
            Valor:{" "}
            {contract.amount_cents
              ? formatCentsBRL(contract.amount_cents)
              : "a combinar"}
          </p>
          <p>
            Periodicidade: {BILLING_LABEL[contract.billing_period ?? ""] ?? "—"}
          </p>
          <p>Forma de pagamento: {contract.payment_method ?? "—"}</p>
        </section>

        {contract.notes ? (
          <section className="mb-6">
            <h2 className="text-fg-secondary mb-1 text-sm font-semibold tracking-wide uppercase print:text-black">
              Cláusulas e observações
            </h2>
            <p className="whitespace-pre-wrap">{contract.notes}</p>
          </section>
        ) : null}

        <section className="mt-16 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-line border-t pt-2 print:border-black">
              {client?.name ?? "Contratante"}
            </div>
          </div>
          <div className="text-center">
            <div className="border-line border-t pt-2 print:border-black">
              {workspace?.name ?? "Contratado"}
            </div>
          </div>
        </section>

        {contract.signed_at ? (
          <p className="text-fg-muted mt-8 text-center text-[length:var(--text-caption-size)] print:text-black">
            Assinado em {formatDate(contract.signed_at)}
            {contract.signed_document_url
              ? ` — documento: ${contract.signed_document_url}`
              : ""}
          </p>
        ) : null}
      </article>
    </div>
  );
}
