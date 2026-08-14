import { GcalConnectCard } from "@/components/gcal/GcalConnectCard";
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
    <div className="mx-auto flex max-w-[var(--max-width-read)] flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
          Configurações
        </h1>
        <p className="text-fg-secondary">Integrações e preferências</p>
      </div>

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

      <WorkspaceSettings />
    </div>
  );
}
