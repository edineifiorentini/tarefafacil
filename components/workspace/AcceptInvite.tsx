"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { acceptInvite } from "@/lib/queries/useInvites";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const accept = useMutation({ mutationFn: () => acceptInvite(token) });
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    accept.mutate();
    // dispara uma vez ao montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-[var(--max-width-read)] flex-col items-center gap-4 px-6 py-16 text-center">
      {accept.isPending || accept.isIdle ? (
        <p className="text-fg-secondary">Aceitando convite…</p>
      ) : accept.isSuccess ? (
        <>
          <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
            Você entrou no workspace
          </h1>
          <p className="text-fg-secondary">
            Seu acesso foi liberado. A troca entre workspaces chega numa próxima
            fase.
          </p>
          <Button variant="primary" onClick={() => router.push("/hoje")}>
            Ir para Hoje
          </Button>
        </>
      ) : (
        <>
          <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
            Convite inválido
          </h1>
          <p className="text-fg-secondary">
            O link pode ter expirado ou já ter sido usado. Peça um novo a quem
            convidou.
          </p>
          <Button variant="secondary" onClick={() => router.push("/hoje")}>
            Voltar
          </Button>
        </>
      )}
    </div>
  );
}
