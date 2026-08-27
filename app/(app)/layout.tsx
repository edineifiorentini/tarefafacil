import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { NAV_COMMERCIAL_COOKIE } from "@/components/shell/Sidebar";
import { isPlatformAdmin } from "@/lib/admin/admin";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/AppShell";
import { ShellProvider } from "@/components/shell/shell-context";
import { AccessExpired } from "@/components/workspace/AccessExpired";
import { CreateWorkspace } from "@/components/workspace/CreateWorkspace";
import { PendingApproval } from "@/components/workspace/PendingApproval";
import { BrandSync } from "@/components/branding/BrandSync";
import { SupportBanner } from "@/components/shell/SupportBanner";
import { PomodoroProvider } from "@/lib/pomodoro/PomodoroContext";
import { WorkspaceProvider } from "@/lib/queries/useWorkspace";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_COOKIE, readSupportCookie } from "@/lib/support/session";
import { parseBrandTheme } from "@/lib/branding/themes";

// Guarda de autenticação + workspace ativo + casca de navegação (AppShell).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cadastro pela metade — quem entra pelo Google nunca passa pelo
  // formulário. A 0063 deu `onboarding_completed_at` a todo mundo que já
  // existia, então ninguém antigo cai aqui.
  const { data: perfil } = await supabase
    .from("app_user")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil && !perfil.onboarding_completed_at) {
    redirect("/completar-cadastro");
  }

  // Empresa excluída logicamente pela plataforma (0073) some daqui. É o que
  // faz a exclusão valer para quem usa: a linha continua no banco, guardada
  // e restaurável por 30 dias, mas ninguém entra nela.
  const { data: workspaces } = await supabase
    .from("workspace")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!workspaces || workspaces.length === 0) {
    // Sem workspace ativo: pode ser convidado aguardando aprovação (entrou
    // como 'pending') OU usuário novo de fato. Distingue pela própria linha
    // de membership (visível via policy workspace_member_self_select).
    const { data: pending } = await supabase
      .from("workspace_member")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1);
    if (pending && pending.length > 0) {
      return <PendingApproval />;
    }
    return <CreateWorkspace />;
  }

  // Workspace ativo: preferência salva em cookie, senão o primeiro.
  const cookieStore = await cookies();
  const activeId = cookieStore.get("active_workspace")?.value;
  const workspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  // Venda por período: bloqueia o workspace vencido (o admin da plataforma
  // nunca é bloqueado, para conseguir renovar).
  const admin = isPlatformAdmin(user.email);
  // Server Component: Date.now() roda no servidor a cada request (ok aqui).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const expired =
    !!workspace.access_expires_at &&
    new Date(workspace.access_expires_at).getTime() < now;
  if (!admin && (workspace.suspended || expired)) {
    return (
      <AccessExpired
        workspaceName={workspace.name}
        reason={workspace.suspended ? "suspended" : "expired"}
      />
    );
  }

  const { data: sectors } = await supabase
    .from("sector")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("archived_at", null)
    .order("position", { ascending: true });

  // Acesso de suporte: o cookie é assinado, então a faixa não pode ser
  // escondida mexendo no navegador. Só aparece na conta que a sessão abriu —
  // se o admin trocar de workspace, ele saiu do escopo do suporte.
  const suporteBruto = cookieStore.get(SUPPORT_COOKIE)?.value;
  const suporte = readSupportCookie(suporteBruto);

  // Cookie presente mas reprovado (vencido, adulterado, ou o segredo do
  // deploy mudou): a sessão personificada tem que cair. É AQUI e não no
  // proxy porque a verificação usa node:crypto, que o runtime do proxy não
  // tem — e uma sessão de suporte sem prazo é o que não pode existir.
  if (suporteBruto && !suporte) {
    redirect("/api/admin/support/stop");
  }

  const emSuporte = suporte?.workspaceId === workspace.id ? suporte : null;

  return (
    <Providers>
      {/* O <html> já veio pintado pelo cookie; isto só age quando o cookie
          está desatualizado — primeiro acesso, ou troca de empresa. */}
      <BrandSync theme={parseBrandTheme(workspace.brand_theme)} />
      {emSuporte ? (
        <SupportBanner
          workspaceName={workspace.name}
          adminEmail={emSuporte.adminEmail}
          expiresAt={new Date(emSuporte.exp * 1000).toISOString()}
        />
      ) : null}
      <WorkspaceProvider workspace={workspace}>
        <PomodoroProvider>
          <ShellProvider>
            <AppShell
              sectors={sectors ?? []}
              workspaces={workspaces}
              isAdmin={admin}
              commercialOpen={
                cookieStore.get(NAV_COMMERCIAL_COOKIE)?.value === "1"
              }
            >
              {children}
            </AppShell>
          </ShellProvider>
        </PomodoroProvider>
      </WorkspaceProvider>
    </Providers>
  );
}
