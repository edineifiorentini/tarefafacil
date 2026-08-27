"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import type { PlanRow } from "@/lib/admin/types";

// Radix reserva "" para "sem valor": "sem plano" precisa de valor próprio.
const SEM_PLANO = "none";

/**
 * Cadastro manual de cliente (especificação 9.5).
 *
 * Saiu de dentro de `AdminClients` para a listagem poder ser um Server
 * Component. Ganhou `abrirDireto`, que é o que faz o "Novo cliente" da barra
 * superior funcionar: ele leva para `/admin/empresas?novo=1`, e antes esse
 * parâmetro era ignorado — o botão só trocava de página.
 *
 * O administrador NÃO define senha (especificação 9.5). O dono precisa já
 * ter conta; o acesso dele continua sendo dele.
 */
export function CreateClientDialog({
  plans,
  abrirDireto = false,
}: {
  plans: PlanRow[];
  abrirDireto?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  // Abre já aberto quando a URL pede. Sem efeito: quem chama passa uma `key`
  // que muda com o parâmetro, então o componente remonta e o valor inicial
  // vale de novo. Efeito que chama setState no primeiro render é o que o
  // compilador do React acusa — com razão, porque renderiza duas vezes.
  const [open, setOpen] = useState(abrirDireto);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState(SEM_PLANO);

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          owner_email: email,
          plan_id: planId === SEM_PLANO ? null : planId,
        }),
      });
      if (res.status === 404) throw new Error("owner_not_found");
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Cliente cadastrado" });
      setName("");
      setEmail("");
      setPlanId(SEM_PLANO);
      setOpen(false);
      router.refresh();
    },
    onError: (e) => {
      toast.show({
        message:
          e instanceof Error && e.message === "owner_not_found"
            ? "Esse e-mail ainda não tem conta. Peça para o dono se cadastrar primeiro."
            : "Não foi possível cadastrar",
      });
    },
  });

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Cadastrar cliente
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && email.trim()) create.mutate();
      }}
      className="border-line bg-card flex flex-wrap items-end gap-2 rounded-md border p-3"
    >
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Nome do cliente
        <div className="w-56">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Empresa do cliente"
            aria-label="Nome do cliente"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        E-mail do dono
        <div className="w-64">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dono@empresa.com"
            aria-label="E-mail do dono"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Plano
        <div className="w-40">
          <Select
            options={[
              { value: SEM_PLANO, label: "Sem plano" },
              ...plans
                .filter((p) => p.active)
                .map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={planId}
            onValueChange={setPlanId}
            aria-label="Plano do cliente"
          />
        </div>
      </label>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        isLoading={create.isPending}
      >
        Criar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Cancelar
      </Button>
    </form>
  );
}
