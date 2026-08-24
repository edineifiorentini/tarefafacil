import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { NotificationPrefs } from "@/components/config/NotificationPrefs";
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { OrgProfileForm } from "@/components/workspace/OrgProfileForm";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";

const GCAL_MESSAGES: Record<string, string> = {
  ok: "Google Agenda conectado",
  erro: "Não foi possível conectar. Tente de novo",
  sem_refresh:
    "O Google não devolveu autorização de longo prazo. Reconecte e conceda o acesso",
  indisponivel: "Integração com o Google indisponível neste ambiente",
};

/**
 * Configurações em abas.
 *
 * Era uma coluna só, e cresceu até virar rolagem sem fim: identidade da
 * organização, modelos de contrato, equipe, auditoria, Google Agenda — tudo
 * empilhado. Cada aba agora é um assunto, e quem entra para mexer numa coisa
 * não passa pelas outras quatro.
 */
export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal?: string; aba?: string }>;
}) {
  const { gcal, aba } = await searchParams;
  const message = gcal ? GCAL_MESSAGES[gcal] : null;

  // Voltando do Google, a aba certa é a que tem o cartão dele.
  const inicial = gcal ? "integracoes" : (aba ?? "geral");

  return (
    // Mais largo que a coluna de leitura: o editor de modelos precisa de
    // espaço para o texto e o painel de variáveis lado a lado.
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-8 lg:px-6">
      {message ? (
        <p
          role="status"
          className="border-line bg-card text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)]"
        >
          {message}
        </p>
      ) : null}

      <Tabs defaultValue={inicial}>
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="contratos">Modelos de contrato</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <OrgProfileForm />
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegrationsPanel />
        </TabsContent>

        <TabsContent value="assinatura">
          <SubscriptionCard />
        </TabsContent>

        <TabsContent value="notificacoes">
          <NotificationPrefs />
        </TabsContent>

        <TabsContent value="equipe">
          <WorkspaceSettings />
        </TabsContent>

        <TabsContent value="contratos">
          <ContractTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
