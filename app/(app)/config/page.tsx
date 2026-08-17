import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";
import { GcalConnectCard } from "@/components/gcal/GcalConnectCard";
import { OrgProfileForm } from "@/components/workspace/OrgProfileForm";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";

const GCAL_MESSAGES: Record<string, string> = {
  ok: "Google Agenda conectado",
  erro: "Não foi possível conectar. Tente de novo",
  sem_refresh:
    "O Google não devolveu autorização de longo prazo. Reconecte e conceda o acesso",
  indisponivel: "Integração com o Google indisponível neste ambiente",
};

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal?: string }>;
}) {
  const { gcal } = await searchParams;
  const message = gcal ? GCAL_MESSAGES[gcal] : null;

  return (
    // Mais largo que a coluna de leitura: o editor de modelos precisa de
    // espaço para o texto e o painel de variáveis lado a lado.
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-8 lg:px-6">
      {/* O título está na barra superior. */}
      {message ? (
        <p
          role="status"
          className="border-line bg-card text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)]"
        >
          {message}
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
          Integrações
        </h2>
        <GcalConnectCard />
      </section>

      <OrgProfileForm />

      <ContractTemplateManager />

      <WorkspaceSettings />
    </div>
  );
}
