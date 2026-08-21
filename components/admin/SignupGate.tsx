"use client";

import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const KEY = ["admin-settings"] as const;

type Settings = { signups_enabled: boolean };

/**
 * Porta de entrada da plataforma.
 *
 * Fechada, quem chega do nada não consegue criar conta — mas **quem tem
 * convite pendente para o e-mail dele continua entrando**. Isso é o que
 * impede o bloqueio de trancar a porta na cara do time dos seus clientes,
 * e é por isso que o aviso abaixo fala de convite com e-mail: enquanto a
 * porta estiver fechada, convite por link aberto não cria conta nova.
 */
export function SignupGate() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Settings> => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("forbidden");
      return (await res.json()) as Settings;
    },
  });

  const alternar = useMutation({
    mutationFn: async (aberto: boolean) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signups_enabled: aberto }),
      });
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: (_r, aberto) => {
      toast.show({
        message: aberto
          ? "Cadastros abertos"
          : "Cadastros fechados. Convites por e-mail continuam valendo.",
      });
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast.show({ message: "Não foi possível alterar" }),
  });

  if (isPending || !data) return null;

  const aberto = data.signups_enabled;

  return (
    <section className="border-line bg-card flex flex-wrap items-center gap-3 rounded-md border p-3">
      {aberto ? (
        <IconLockOpen
          size={18}
          stroke={1.75}
          aria-hidden
          className="text-fg-secondary shrink-0"
        />
      ) : (
        <IconLock
          size={18}
          stroke={1.75}
          aria-hidden
          className="text-overdue shrink-0"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-fg text-[length:var(--text-small-size)] font-medium">
          {aberto ? "Cadastros abertos" : "Cadastros fechados"}
        </p>
        <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
          {aberto
            ? "Qualquer pessoa com e-mail ou conta Google cria um workspace e ganha 7 dias de teste."
            : "Só entra quem tem convite pendente para o próprio e-mail. Convite por link aberto não cria conta nova enquanto isso."}
        </p>
      </div>

      <Button
        variant={aberto ? "secondary" : "primary"}
        size="sm"
        isLoading={alternar.isPending}
        onClick={() => alternar.mutate(!aberto)}
      >
        {aberto ? "Fechar cadastros" : "Abrir cadastros"}
      </Button>
    </section>
  );
}
