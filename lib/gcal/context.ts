// Resolve o usuário autenticado + o workspace ativo no servidor, do mesmo jeito
// que o layout do app (primeiro workspace via RLS). Usado pelas rotas gcal.

import { createClient } from "@/lib/supabase/server";

export type GcalContext = {
  userId: string;
  workspaceId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function requireUserAndWorkspace(): Promise<GcalContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ws } = await supabase
    .from("workspace")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return null;

  return { userId: user.id, workspaceId: ws.id, supabase };
}
