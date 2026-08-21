import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A porta está aberta?
 *
 * Rota pública, e de propósito: a tela de login precisa saber disso ANTES de
 * ter sessão, e o fato já é observável por qualquer um que tente se
 * cadastrar. Devolve um booleano e nada mais — nenhum outro ajuste da
 * plataforma sai por aqui.
 *
 * Sem isto, quem tenta entrar com os cadastros fechados vê "Database error
 * creating new user", que parece defeito do sistema em vez de decisão de
 * quem administra.
 */
export async function GET() {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("platform_setting")
      .select("signups_enabled")
      .limit(1)
      .maybeSingle();
    // Na dúvida, aberto: é o mesmo padrão do trigger. Uma falha de leitura
    // não pode fazer o login anunciar que a porta está fechada.
    return NextResponse.json({ open: data?.signups_enabled ?? true });
  } catch {
    return NextResponse.json({ open: true });
  }
}
