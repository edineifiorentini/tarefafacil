import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isPlatformAdmin } from "@/lib/admin/admin";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/AppShell";
import { ShellProvider } from "@/components/shell/shell-context";
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
            isAdmin={isPlatformAdmin(user.email)}
          >
            {children}
          </AppShell>
        </ShellProvider>
      </WorkspaceProvider>
    </Providers>
  );
}
