import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/AppShell";
import { ShellProvider } from "@/components/shell/shell-context";
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
    .order("created_at", { ascending: true })
    .limit(1);

  const workspace = workspaces?.[0];

  if (!workspace) {
    return (
      <div className="p-8 text-fg">
        Nenhum workspace encontrado para esta conta.
      </div>
    );
  }

  const { data: sectors } = await supabase
    .from("sector")
    .select("*")
    .is("archived_at", null)
    .order("position", { ascending: true });

  return (
    <Providers>
      <WorkspaceProvider workspace={workspace}>
        <ShellProvider>
          <AppShell sectors={sectors ?? []}>{children}</AppShell>
        </ShellProvider>
      </WorkspaceProvider>
    </Providers>
  );
}
