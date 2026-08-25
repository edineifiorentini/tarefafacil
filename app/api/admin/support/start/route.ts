import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  SUPPORT_COOKIE,
  SUPPORT_TTL_MINUTES,
  signSupportCookie,
  supportConfigured,
} from "@/lib/support/session";

/**
 * Abre um acesso de suporte na conta de um cliente.
 *
 * O mecanismo é o padrão do Supabase para personificação: a chave secreta
 * gera um `hashed_token` para o dono do workspace e o servidor troca esse
 * token por sessão. **Nenhum e-mail sai** — `generateLink` existe para quem
 * usa provedor de e-mail próprio e só devolve o token; o cliente não recebe
 * link nenhum na caixa dele.
 *
 * Duas travas independentes, de propósito: estar em `PLATFORM_ADMIN_EMAILS`
 * (quem) e ter `SUPPORT_ACCESS_SECRET` no ambiente (onde). Um e-mail de
 * admin vazado não abre nada sem o segredo do deploy, e o segredo sozinho
 * também não.
 *
 * O motivo é obrigatório. Não é burocracia: seis meses depois, "por que
 * alguém entrou na minha conta em março" é a pergunta que aparece, e sem o
 * motivo escrito não há resposta.
 */
export async function POST(request: Request) {
  if (!supportConfigured()) {
    return NextResponse.json({ error: "sem_segredo" }, { status: 503 });
  }

  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { workspaceId?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!workspaceId || reason.length < 5) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = createAdminClient();

  // Quem entra é o dono: é a única pessoa que enxerga a conta inteira, que é
  // o ponto de olhar como suporte.
  const { data: workspace } = await db
    .from("workspace")
    .select("id, name, owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // `owner_user_id` é anulável (o dono pode ter saído). Sem dono não há em
  // nome de quem entrar, e inventar outro membro seria escolher sozinho o
  // nível de acesso — melhor recusar e dizer o porquê.
  if (!workspace.owner_user_id) {
    return NextResponse.json({ error: "owner_without_email" }, { status: 409 });
  }

  const { data: dono } = await db
    .from("app_user")
    .select("id, email")
    .eq("id", workspace.owner_user_id)
    .maybeSingle();
  if (!dono?.email) {
    return NextResponse.json({ error: "owner_without_email" }, { status: 409 });
  }

  // Quem está pedindo, como linha de `app_user` — para a trilha apontar para
  // uma pessoa de verdade e não só para um texto de e-mail.
  const supabaseAtual = await createClient();
  const {
    data: { user: quemPede },
  } = await supabaseAtual.auth.getUser();

  const expiraEm = new Date(Date.now() + SUPPORT_TTL_MINUTES * 60_000);

  const { data: sessao, error: erroSessao } = await db
    .from("support_session")
    .insert({
      workspace_id: workspace.id,
      admin_email: admin.email,
      admin_user_id: quemPede?.id ?? null,
      impersonated_user_id: dono.id,
      reason,
      expires_at: expiraEm.toISOString(),
    })
    .select("id")
    .single();
  if (erroSessao || !sessao) {
    return NextResponse.json({ error: "session_failed" }, { status: 500 });
  }

  // A trilha do CLIENTE registra a entrada, com o nome de quem entrou. Ele
  // vê no próprio histórico — é o que separa suporte de bisbilhotice.
  if (quemPede?.id) {
    await db.rpc("write_audit_as", {
      ws: workspace.id,
      autor: quemPede.id,
      acao: "criou",
      tipo: "support_session",
      id_entidade: sessao.id,
      resumo: `${admin.email} abriu um acesso de suporte — ${reason}`,
    });
  }

  const { data: link, error: erroLink } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: dono.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (erroLink || !tokenHash) {
    return NextResponse.json({ error: "link_failed" }, { status: 500 });
  }

  // Trocar o token por sessão escreve os cookies do Supabase na resposta —
  // a partir daqui o navegador está logado como o dono. A sessão do admin é
  // substituída; ao encerrar o suporte ele entra de novo com a dele.
  const { error: erroOtp } = await supabaseAtual.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (erroOtp) {
    return NextResponse.json({ error: "signin_failed" }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SUPPORT_COOKIE,
    signSupportCookie({
      sessionId: sessao.id,
      workspaceId: workspace.id,
      adminEmail: admin.email,
      exp: Math.floor(expiraEm.getTime() / 1000),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SUPPORT_TTL_MINUTES * 60,
    }
  );

  // O workspace ativo precisa ser o do cliente, senão a casca abre no
  // primeiro workspace do dono e o suporte olha a conta errada.
  cookieStore.set("active_workspace", workspace.id, { path: "/" });

  return NextResponse.json({ ok: true, workspace: workspace.name });
}
