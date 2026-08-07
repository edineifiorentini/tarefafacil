import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

// Cliente Supabase para o servidor (Server Components, Route Handlers, Server
// Actions). cookies() é assíncrono no Next 16. Usa a publishable key (RLS).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component: ignorável — o proxy renova a
            // sessão nos cookies da resposta.
          }
        },
      },
    }
  );
}
