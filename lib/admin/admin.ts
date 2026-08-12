// Identidade do admin da plataforma (você, o vendedor). Lista de e-mails em
// PLATFORM_ADMIN_EMAILS (separados por vírgula). Só servidor.

import { createClient } from "@/lib/supabase/server";

export function platformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformAdminEmails().includes(email.toLowerCase());
}

// Retorna o usuário se for admin da plataforma; senão null.
export async function requirePlatformAdmin(): Promise<{ email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdmin(user.email)) return null;
  return { email: user.email };
}
