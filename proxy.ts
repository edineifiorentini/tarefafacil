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
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    // Aceite de convite: a própria página decide login/redirect (precisa
    // renderizar mesmo sem sessão para preservar o token no /login?next=).
    path.startsWith("/convite") ||
    // Link público de demanda: quem abre não tem conta, por definição.
    path.startsWith("/d/") ||
    // Webhook do Google: chamado sem sessão (o Google não tem cookie).
    path.startsWith("/api/gcal/webhook") ||
    // Cron da Vercel: chega sem sessão e se autentica pelo CRON_SECRET, que a
    // própria rota confere. Sem segredo configurado ela responde 401.
    path.startsWith("/api/cron/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
