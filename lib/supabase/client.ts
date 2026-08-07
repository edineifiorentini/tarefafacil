import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

// Cliente Supabase para o browser (Client Components). Usa a publishable key
// — respeita RLS. Nunca a secret key aqui.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
