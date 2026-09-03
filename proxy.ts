import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next 16: o antigo "middleware" agora se chama Proxy (proxy.ts na raiz).
// Renova a sessão do Supabase e protege as rotas.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() valida o token; não colocar lógica entre criar o
  // cliente e esta chamada.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    // A raiz é a landing page do produto: ela existe justamente para
    // quem ainda não tem conta. Comparação EXATA, nunca `startsWith`,
    // que aqui casaria com a aplicação inteira.
    path === "/" ||
    // A imagem social. Ela é buscada por robô de WhatsApp, LinkedIn e
    // Facebook, que obviamente não têm sessão — sem esta linha o
    // scraper recebia 307 para o login e o link era compartilhado sem
    // prévia nenhuma. O `matcher` lá embaixo não a cobre: ele isenta
    // caminhos com extensão de imagem, e esta rota não tem extensão.
    path === "/opengraph-image" ||
    path === "/twitter-image" ||
    path.startsWith("/login") ||
    // Cadastro e termos: quem abre não tem conta, por definição.
    path.startsWith("/cadastro") ||
    path.startsWith("/termos") ||
    path.startsWith("/privacidade") ||
    path.startsWith("/auth") ||
    // Aceite de convite: a própria página decide login/redirect (precisa
    // renderizar mesmo sem sessão para preservar o token no /login?next=).
    path.startsWith("/convite") ||
    // Link público de demanda: quem abre não tem conta, por definição.
    path.startsWith("/d/") ||
    // Entregável do link público (0083). Precisa entrar SEPARADO: a regra
    // acima cobre `/d/`, não `/api/d/`, e sem esta linha a imagem do
    // criativo era redirecionada para o login — o cliente via um retângulo
    // quebrado e a função nascia morta.
    //
    // Quem autoriza é a própria rota, que confere o token, o vínculo do
    // anexo com a demanda daquele link e a marca `entregavel` antes de
    // assinar qualquer URL.
    path.startsWith("/api/d/") ||
    // Link de indicação: existe justamente para trazer quem ainda não tem
    // conta. Ele grava o clique e manda para o login.
    path.startsWith("/r/") ||
    // Webhook do Google: chamado sem sessão (o Google não tem cookie).
    path.startsWith("/api/gcal/webhook") ||
    // Webhook de pagamento: o provedor também não tem cookie. Quem autoriza
    // é BILLING_WEBHOOK_SECRET, conferido dentro da rota antes de ela ler o
    // corpo — sem a variável, ela responde 503 e não faz nada.
    path.startsWith("/api/webhooks/") ||
    // Consulta pública de "os cadastros estão abertos?": a tela de login
    // precisa dela sem sessão, e a resposta é um booleano só.
    path.startsWith("/api/signups") ||
    // Cron da Vercel: chega sem sessão e se autentica pelo CRON_SECRET, que a
    // própria rota confere. Sem segredo configurado ela responde 401.
    path.startsWith("/api/cron/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Quem já está logado não precisa da página de vendas: vai direto
  // para o trabalho. Fica AQUI e não na página para `app/page.tsx`
  // continuar estático — o proxy já tem o usuário em mãos e roda antes.
  if (user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/hoje";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    // Já logado: se veio com destino (ex.: link de convite), respeita-o.
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/hoje";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Roda em tudo, menos assets estáticos.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
