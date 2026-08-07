import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let client: BrowserClient | undefined;

// Cliente Supabase para o browser (Client Components). Usa a publishable key
// — respeita RLS. Nunca a secret key aqui. Memoizado (singleton) para o
// TanStack Query não recriar a cada render.
export function createClient(): BrowserClient {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return client;
}
