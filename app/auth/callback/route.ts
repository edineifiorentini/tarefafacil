import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { atribuirIndicacao, REF_COOKIE } from "@/lib/admin/referral";
import { createClient } from "@/lib/supabase/server";

// Troca o code (PKCE) por uma sessão. Serve tanto para magic link quanto para
// OAuth (Google). Configure em Supabase > Auth > URL Configuration:
//   Site URL: http://localhost:3000
//   Redirect URLs: http://localhost:3000/**
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/hoje";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const resposta = NextResponse.redirect(`${origin}${next}`);

      // Veio por link de indicação? É aqui que o cadastro novo encontra o
      // afiliado — a função só atribui workspace recém-criado e sem dono de
      // indicação, então login de quem já é cliente passa reto.
      const ref = (await cookies()).get(REF_COOKIE)?.value;
      if (ref && data.user) {
        await atribuirIndicacao(data.user.id, ref);
        // Consumido: deixar o cookie vivo faria a próxima conta criada no
        // mesmo navegador contar de novo para o mesmo afiliado.
        resposta.cookies.delete(REF_COOKIE);
      }

      return resposta;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
