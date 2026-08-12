import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isPlatformAdmin } from "@/lib/admin/admin";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/AppShell";
import { ShellProvider } from "@/components/shell/shell-context";
import { AccessExpired } from "@/components/workspace/AccessExpired";
import { CreateWorkspace } from "@/components/workspace/CreateWorkspace";
import { WorkspaceProvider } from "@/lib/queries/useWorkspace";
import { createClient } from "@/lib/supabase/server";

// Guarda de autenticação + workspace ativo + casca de navegação (AppShell).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workspaces } = await supabase
    .from("workspace")
    .select("*")
    .order("created_at", { ascending: true });

  if (!workspaces || workspaces.length === 0) {
    return <CreateWorkspace />;
  }

  // Workspace ativo: preferência salva em cookie, senão o primeiro.
  const cookieStore = await cookies();
  const activeId = cookieStore.get("active_workspace")?.value;
  const workspace =
    workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  // Venda por período: bloqueia o workspace vencido (o admin da plataforma
  // nunca é bloqueado, para conseguir renovar).
  const admin = isPlatformAdmin(user.email);
  // Server Component: Date.now() roda no servidor a cada request (ok aqui).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const expired =
    !!workspace.access_expires_at &&
    new Date(workspace.access_expires_at).getTime() < now;
  if (expired && !admin) {
    return <AccessExpired workspaceName={workspace.name} />;
  }

  const { data: sectors } = await supabase
    .from("sector")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("archived_at", null)
    .order("position", { ascending: true });

  return (
    <Providers>
      <WorkspaceProvider workspace={workspace}>
        <ShellProvider>
          <AppShell
            sectors={sectors ?? []}
            workspaces={workspaces}
            isAdmin={admin}
          >
            {children}
          </AppShell>
        </ShellProvider>
      </WorkspaceProvider>
    </Providers>
  );
}
