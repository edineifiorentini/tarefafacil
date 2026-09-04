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

/** Do mais fraco para o mais forte. A ordem é a permissão. */
const FORCA = { viewer: 0, member: 1, admin: 2, owner: 3 } as const;

export type PapelDoMembro = keyof typeof FORCA;

/**
 * O papel de quem está pedindo, ou `null` se ele não é membro ativo.
 *
 * `requireUserAndWorkspace` responde "quem é" e "onde"; não responde "pode".
 * Faltava o terceiro, e a falta apareceu na conexão do Google: a rota
 * exigia só estar logado, e como `google_connection` é chaveada por
 * EMPRESA, qualquer membro — inclusive um `viewer`, que não escreve nada no
 * resto do app — podia substituir a conta do Google da empresa inteira.
 */
export async function papelNoWorkspace(
  ctx: SessionContext
): Promise<PapelDoMembro | null> {
  const { data } = await ctx.supabase
    .from("workspace_member")
    .select("role, status")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (!data || data.status !== "active") return null;
  return data.role in FORCA ? (data.role as PapelDoMembro) : null;
}

/** `true` quando o papel alcança o mínimo pedido. */
export function papelAlcanca(
  papel: PapelDoMembro | null,
  minimo: PapelDoMembro
): boolean {
  if (!papel) return false;
  return FORCA[papel] >= FORCA[minimo];
}
