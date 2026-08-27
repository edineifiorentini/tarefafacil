// Identidade do admin da plataforma (você, o vendedor). Lista de e-mails em
// PLATFORM_ADMIN_EMAILS (separados por vírgula). Só servidor.

import { createClient } from "@/lib/supabase/server";

/**
 * Sem a variável, NINGUÉM é admin da plataforma — nem o dono.
 *
 * Fechar é o comportamento certo (o contrário seria abrir o painel de todas
 * as empresas por um descuido de configuração), mas ele acontecia em
 * silêncio: o item "Plataforma" some do menu, `/admin` redireciona, e não há
 * pista nenhuma de que a causa é ambiente e não permissão.
 *
 * O aviso aparece uma vez por processo no log do servidor. Foi assim que se
 * descobriu que a variável estava só no `.env.local` e nunca tinha ido para
 * a Vercel — em produção o painel nunca abriu para ninguém.
 */
let jaAvisou = false;

export function platformAdminEmails(): string[] {
  const lista = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (lista.length === 0 && !jaAvisou) {
    jaAvisou = true;
    console.warn(
      "[admin] PLATFORM_ADMIN_EMAILS não está configurada: o painel da plataforma fica fechado para todos, inclusive o dono."
    );
  }

  return lista;
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformAdminEmails().includes(email.toLowerCase());
}

// Retorna o usuário se for admin da plataforma; senão null.
export async function requirePlatformAdmin(): Promise<{
  email: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdmin(user.email)) return null;
  return { email: user.email };
}
