// Resolve o usuário autenticado + o workspace ativo no servidor, do mesmo jeito
// que o layout do app (primeiro workspace via RLS).
//
// Morava em lib/gcal/ por ter nascido lá, mas nunca foi só do Google: a
// exportação de dados já importava daqui, e agora as rotas de pagamento
// também. Rota de dinheiro puxando contexto de "lib/gcal" é o tipo de pista
// falsa que faz alguém procurar acoplamento que não existe.

import { createClient } from "@/lib/supabase/server";

export type SessionContext = {
  userId: string;
  workspaceId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function requireUserAndWorkspace(): Promise<SessionContext | null> {
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
