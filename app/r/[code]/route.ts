import { NextResponse } from "next/server";

import { REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/admin/referral";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Link de indicação: /r/<code>.
 *
 * Registra o clique, guarda o código num cookie e manda a pessoa para o
 * login. A indicação só vira atribuição quando a conta é criada — quem
 * atribui é `/auth/callback`, que sabe se o cadastro é novo.
 *
 * Link inválido ou de afiliado desativado não é erro na cara do visitante:
 * ele simplesmente entra sem indicação.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const origin = new URL(request.url).origin;
  const destino = NextResponse.redirect(`${origin}/login`);

  const normalizado = code.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,32}$/.test(normalizado)) return destino;

  const db = createAdminClient();
  const { data: afiliado } = await db
    .from("affiliate")
    .select("id")
    .eq("code", normalizado)
    .eq("active", true)
    .maybeSingle();
  if (!afiliado) return destino;

  // Origem e navegador bastam para saber de onde veio a divulgação. IP não
  // entra: é dado pessoal e não muda nenhuma decisão aqui.
  await db.from("affiliate_click").insert({
    affiliate_id: afiliado.id,
    referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  destino.cookies.set(REF_COOKIE, normalizado, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REF_COOKIE_MAX_AGE,
  });
  return destino;
}
