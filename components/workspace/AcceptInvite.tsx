"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { acceptInvite } from "@/lib/queries/useInvites";

type State = "loading" | "success" | "full" | "invalid";

// Roda fora do grupo (app), sem QueryClientProvider — por isso usa estado
// local em vez de react-query. Aceite dispara uma única vez (ref guard).
export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    acceptInvite(token)
      .then(() => setState("success"))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        setState(msg.includes("cheia") ? "full" : "invalid");
      });
  }, [token]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--max-width-read)] flex-col items-center justify-center gap-4 px-6 text-center">
      {state === "loading" ? (
        <p className="text-fg-secondary">Aceitando convite…</p>
      ) : state === "success" ? (
        <>
          <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
            Pedido enviado
          </h1>
          <p className="text-fg-secondary">
            O dono do workspace precisa aprovar sua entrada. Assim que aprovar,
            o workspace aparece no seletor no topo da barra lateral.
          </p>
          <Button variant="primary" onClick={() => router.push("/hoje")}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
            {state === "full" ? "Equipe cheia" : "Convite inválido"}
          </h1>
          <p className="text-fg-secondary">
            {state === "full"
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
