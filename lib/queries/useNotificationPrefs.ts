"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { prefsFrom, type Prefs } from "@/lib/notifications/prefs";
import { createClient } from "@/lib/supabase/client";
import type { NotificationPreference } from "@/types/database";

const KEY = ["notificationPrefs"] as const;

/**
 * Preferências do sino, da pessoa que está logada.
 *
 * Não existe linha até alguém mexer num interruptor: quem nunca abriu a tela
 * recebe tudo, e o banco não guarda uma linha por usuário só para dizer
 * "sim" seis vezes.
 */
export function useNotificationPrefs() {
  const supabase = createClient();
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Prefs> => {
      // A RLS já limita à própria linha.
      const { data, error } = await supabase
        .from("notification_preference")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return prefsFrom(data as NotificationPreference | null);
    },
    // Preferência muda de vez em nunca; não vale revalidar a cada foco.
    staleTime: 5 * 60_000,
  });
}

export function useSaveNotificationPrefs() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("sem sessão");

      // Upsert: a primeira mudança cria a linha, as seguintes atualizam.
      const { error } = await supabase
        .from("notification_preference")
        .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY });
      const antes = qc.getQueryData<Prefs>(KEY);
      qc.setQueryData<Prefs>(KEY, (atual) =>
        atual ? { ...atual, ...patch } : undefined
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(KEY, ctx.antes);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
