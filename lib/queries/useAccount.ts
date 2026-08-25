"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type Account = {
  email: string | null;
  /** Já dá para entrar por e-mail e senha, sem passar pelo Google. */
  hasPassword: boolean;
  /** Entrou por algum provedor externo (hoje só o Google). */
  hasGoogle: boolean;
};

/**
 * Como a conta atual consegue entrar.
 *
 * A resposta está em `app_metadata.providers`, e não em `identities`: o
 * `identities` chega vazio pela API administrativa, então usá-lo daria
 * "sem senha" para todo mundo. Verificado contra o projeto real —
 * `providers` vem `["google"]` ou `["email"]` conforme o caminho do
 * cadastro.
 */
export function useAccount() {
  const supabase = createClient();

  return useQuery<Account>({
    queryKey: ["account"],
    staleTime: 60_000,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const providers = (user?.app_metadata?.providers ?? []) as string[];
      return {
        email: user?.email ?? null,
        hasPassword: providers.includes("email"),
        hasGoogle: providers.includes("google"),
      };
    },
  });
}
