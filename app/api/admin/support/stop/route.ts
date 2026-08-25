import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_COOKIE, readSupportCookie } from "@/lib/support/session";

/**
 * Encerra o acesso de suporte.
 *
 * Fecha a linha em `support_session`, registra a saída na trilha do cliente
 * e derruba a sessão personificada. O admin volta a entrar com a conta dele
 * — a sessão de suporte substituiu a dele no navegador, e é isso que
 * garante que não sobre acesso pendurado.
 *
 * Não exige ser admin da plataforma: quem tem o cookie assinado está numa
 * sessão de suporte, e **encerrar sempre pode**. Exigir permissão para sair
 * criaria o caso absurdo de alguém preso numa sessão que não consegue
 * fechar.
 */
/**
 * Encerramento forçado, para o cookie vencido ou adulterado.
 *
 * O layout manda para cá quando encontra um cookie de suporte que não passa
 * na verificação. Precisa ser GET porque quem dispara é um `redirect` de
 * Server Component, e precisa ser uma rota porque Server Component não
 * consegue apagar cookie — a tentativa é engolida em silêncio, e a sessão
 * personificada continuaria de pé sem faixa nenhuma na tela.
 *
 * Mutação em GET normalmente é erro. Aqui o pior que alguém consegue
 * forçando esta URL é encerrar um acesso de suporte, que é sempre seguro.
 */
export async function GET(request: Request) {
  await POST();
  return NextResponse.redirect(
    new URL("/login?suporte=encerrado", request.url)
  );
}

export async function POST() {
  const cookieStore = await cookies();
  const claim = readSupportCookie(cookieStore.get(SUPPORT_COOKIE)?.value);

  // Sempre limpa o cookie, mesmo que ele fosse inválido ou já vencido: é o
  // que faz a faixa sumir e o proxy parar de derrubar a navegação.
  cookieStore.delete(SUPPORT_COOKIE);

  if (claim) {
    const db = createAdminClient();
    const { data: sessao } = await db
      .from("support_session")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", claim.sessionId)
      .is("ended_at", null)
      .select("admin_user_id")
      .maybeSingle();

    if (sessao?.admin_user_id) {
      await db.rpc("write_audit_as", {
        ws: claim.workspaceId,
        autor: sessao.admin_user_id,
        acao: "alterou",
        tipo: "support_session",
        id_entidade: claim.sessionId,
        resumo: `${claim.adminEmail} encerrou o acesso de suporte`,
      });
    }
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
