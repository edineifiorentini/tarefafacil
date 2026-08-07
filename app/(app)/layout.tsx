import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { WorkspaceProvider } from "@/lib/queries/useWorkspace";
import { createClient } from "@/lib/supabase/server";

// Guarda de autenticação + workspace ativo para toda a área do app.
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

  return <WorkspaceProvider workspace={workspace}>{children}</WorkspaceProvider>;
}
