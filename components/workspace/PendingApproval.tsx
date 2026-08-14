"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

// Estado do convidado que já aceitou o convite mas ainda não foi aprovado
// pelo dono. Não tem workspace ativo — por isso não vê o AppShell.
export function PendingApproval() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--max-width-read)] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
        Aguardando aprovação
      </h1>
      <p className="text-fg-secondary">
        Seu pedido de entrada foi enviado. Assim que o dono do workspace
        aprovar, você entra automaticamente.
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          isLoading={checking}
          onClick={() => {
            setChecking(true);
            router.refresh();
          }}
        >
          Verificar novamente
        </Button>
        <Button variant="ghost" onClick={signOut}>
          Sair
        </Button>
      </div>
    </div>
  );
}
