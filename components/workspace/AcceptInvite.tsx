"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { acceptInvite } from "@/lib/queries/useInvites";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  // A pessoa entra como PENDENTE; o dono precisa aprovar (anti-invasão).
  const accept = useMutation({ mutationFn: () => acceptInvite(token) });
  const fired = useRef(false);

  const full =
    accept.error instanceof Error && accept.error.message.includes("cheia");

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
            Pedido enviado
          </h1>
          <p className="text-fg-secondary">
            O dono do workspace precisa aprovar sua entrada. Assim que aprovar,
            o workspace aparece no seletor no topo da barra lateral.
          </p>
          <Button variant="primary" onClick={() => router.push("/hoje")}>
            Ir para Hoje
          </Button>
        </>
      ) : (
        <>
          <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
            {full ? "Equipe cheia" : "Convite inválido"}
          </h1>
          <p className="text-fg-secondary">
            {full
              ? "Esta equipe atingiu o limite de membros. Peça a quem convidou para liberar um assento."
              : "O link pode ter expirado ou já ter sido usado. Peça um novo a quem convidou."}
          </p>
          <Button variant="secondary" onClick={() => router.push("/hoje")}>
            Voltar
          </Button>
        </>
      )}
    </div>
  );
}
