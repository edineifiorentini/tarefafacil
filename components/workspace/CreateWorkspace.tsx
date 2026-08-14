"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { createClient } from "@/lib/supabase/client";

// Onboarding mínimo: cria o primeiro workspace quando a conta não tem nenhum.
export function CreateWorkspace() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_workspace", {
      p_name: name.trim() || "Meu workspace",
    });
    setBusy(false);
    if (!error) router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[var(--max-width-read)] flex-col justify-center gap-4 px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-fg text-[length:var(--text-h2-size)] font-semibold">
          Bem-vindo ao TarefaFácil
        </h1>
        <p className="text-fg-secondary">
          Crie seu primeiro workspace para começar
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
        className="flex items-center gap-2"
      >
        <div className="w-64">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do workspace"
            aria-label="Nome do workspace"
            autoFocus
          />
        </div>
        <Button type="submit" variant="primary" isLoading={busy}>
          Criar workspace
        </Button>
      </form>
    </div>
  );
}
