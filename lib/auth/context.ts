// Resolve o usuário autenticado + a empresa ATIVA no servidor, lendo o
// mesmo cookie que o layout do app lê.
//
// Morava em lib/gcal/ por ter nascido lá, mas nunca foi só do Google: a
// exportação de dados já importava daqui, e agora as rotas de pagamento
// também. Rota de dinheiro puxando contexto de "lib/gcal" é o tipo de pista
// falsa que faz alguém procurar acoplamento que não existe.

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type SessionContext = {
  userId: string;
  workspaceId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * O usuário e a empresa ATIVA, do mesmo jeito que a casca decide.
 *
 * **O cookie `active_workspace` é a fonte, e ignorá-lo foi um defeito real**
 * (8/set/2026). Esta função pegava a primeira empresa por data de criação;
 * o layout, que desenha a tela, lê o cookie que o seletor de empresas
 * grava. Quem tinha duas empresas via a tela de uma e as rotas
 * respondendo pela outra: conectar o Google conectava na errada, exportar
 * exportava a errada, e a cobrança mostraria o Pix da errada.
 *
 * Não apareceu antes porque quase todo mundo tem uma empresa só — e com
 * uma, as duas regras dão a mesma resposta. Encontrado abrindo a tela.
 *
 * O `?? workspaces[0]` no fim é o mesmo do layout: cookie ausente ou
 * apontando para empresa que a pessoa não acessa mais cai na primeira, em
 * vez de deixar alguém sem empresa nenhuma.
 */
export async function requireUserAndWorkspace(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // A RLS já recorta para as empresas de que a pessoa é membro, então o
  // cookie não vira uma porta: apontar para empresa alheia não a traz.
  const { data: workspaces } = await supabase
    .from("workspace")
    .select("id")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!workspaces || workspaces.length === 0) return null;

  const cookieStore = await cookies();
  const escolhida = cookieStore.get("active_workspace")?.value;
  const ws = workspaces.find((w) => w.id === escolhida) ?? workspaces[0];

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
