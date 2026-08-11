import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Cliente administrativo: usa a secret key, IGNORA RLS. Só no servidor —
// nunca importar em componente cliente. Usado para a tabela
// `google_connection`, que não tem policy para `authenticated`.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
