"use client";

import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { centsToMaskedInput, parseCurrencyToCents } from "@/lib/finance/money";
import type { PlanRow } from "@/lib/admin/types";

const KEY = ["admin-plans"] as const;

// Plano gratuito é preço zero, e parseCurrencyToCents devolve null para
// valor não positivo. Zero é resposta válida aqui, não erro.
function centsOf(masked: string): number {
  return parseCurrencyToCents(masked) ?? 0;
}

function PlanRowItem({ plan }: { plan: PlanRow }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(centsToMaskedInput(plan.price_cents));
  const [maxUsers, setMaxUsers] = useState(String(plan.max_users));
  const [confirmDelete, setConfirmDelete] = useState(false);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: KEY });
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: plan.id,
        name: name.trim(),
        price_cents: centsOf(price),
        max_users: Number(maxUsers),
        is_public: plan.is_public,
        active: plan.active,
        ...body,
      }),
    });
    if (!res.ok) throw new Error("falha");
  }

  const save = useMutation({
    mutationFn: () => patch({}),
    onSuccess: () => {
      toast.show({ message: "Plano atualizado" });
      invalidate();
    },
    onError: () => toast.show({ message: "Não foi possível salvar" }),
  });

  const toggle = useMutation({
    mutationFn: (body: { is_public?: boolean; active?: boolean }) =>
      patch(body),
    onSuccess: invalidate,
    onError: () => toast.show({ message: "Não foi possível atualizar" }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/plans?id=${plan.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) throw new Error("plan_in_use");
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Plano excluído" });
      invalidate();
    },
    onError: (e) =>
      toast.show({
        message:
          e instanceof Error && e.message === "plan_in_use"
            ? "Há empresas neste plano. Desative em vez de excluir."
            : "Não foi possível excluir",
      }),
  });

  const dirty =
    name.trim() !== plan.name ||
    centsOf(price) !== plan.price_cents ||
    Number(maxUsers) !== plan.max_users;
  const valid = name.trim().length > 0 && Number(maxUsers) >= 1;

  return (
    <tr className="border-line border-t">
      <td className="px-3 py-2">
        <div className="w-52">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`Nome do plano ${plan.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="w-36">
          <CurrencyInput
            value={price}
            onChange={setPrice}
            aria-label={`Valor do plano ${plan.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="w-20">
          <TextInput
            type="number"
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            aria-label={`Usuários do plano ${plan.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <Checkbox
          checked={plan.is_public}
          onCheckedChange={(c) => toggle.mutate({ is_public: c === true })}
          aria-label={`Plano ${plan.name} aparece no cadastro`}
        />
      </td>
      <td className="px-3 py-2">
        <Checkbox
          checked={plan.active}
          onCheckedChange={(c) => toggle.mutate({ active: c === true })}
          aria-label={`Plano ${plan.name} ativo`}
        />
      </td>
      <td className="px-3 py-2">
        <span
          className={`tnum ${plan.workspace_count > 0 ? "text-fg" : "text-fg-muted"}`}
        >
          {plan.workspace_count}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!dirty || !valid}
            isLoading={save.isPending}
            onClick={() => save.mutate()}
          >
            Salvar
          </Button>
          <button
            type="button"
            aria-label={`Excluir plano ${plan.name}`}
            onClick={() => setConfirmDelete(true)}
            className="text-fg-muted hover:bg-hover hover:text-overdue inline-flex h-8 w-8 items-center justify-center rounded-sm"
          >
            <IconTrash size={16} stroke={1.5} />
          </button>
        </div>

        <AlertDialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
              <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Excluir {plan.name}?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-fg-secondary mt-2">
                O plano some do cadastro. Faturas já emitidas guardam cópia do
                nome e do valor, então o histórico de cobrança não muda.
              </AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="ghost" size="sm">
                    Cancelar
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={remove.isPending}
                    onClick={() => remove.mutate()}
                  >
                    Excluir
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </td>
    </tr>
  );
}

function CreatePlan() {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [maxUsers, setMaxUsers] = useState("5");
  const [isPublic, setIsPublic] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price_cents: centsOf(price),
          max_users: Number(maxUsers),
          is_public: isPublic,
        }),
      });
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Plano criado" });
      setName("");
      setPrice("");
      setMaxUsers("5");
      setIsPublic(false);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast.show({ message: "Não foi possível criar o plano" }),
  });

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Criar plano
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && Number(maxUsers) >= 1) create.mutate();
      }}
      className="border-line bg-card flex flex-wrap items-end gap-2 rounded-md border p-3"
    >
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Nome do plano
        <div className="w-56">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Plano Prefeitura"
            aria-label="Nome do plano"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Valor por mês
        <div className="w-36">
          <CurrencyInput
            value={price}
            onChange={setPrice}
            aria-label="Valor por mês"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Usuários
        <div className="w-20">
          <TextInput
            type="number"
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            aria-label="Usuários do plano"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex items-center gap-2 py-2 text-[length:var(--text-caption-size)]">
        <Checkbox
          checked={isPublic}
          onCheckedChange={(c) => setIsPublic(c === true)}
          aria-label="Mostrar no cadastro"
        />
        Mostrar no cadastro
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

/**
 * Cadastro de planos da plataforma.
 *
 * Plano é tabela de preço, não contrato: mudar o valor vale do próximo ciclo
 * em diante. Fatura já emitida guarda cópia do nome e do valor, então editar
 * aqui nunca reescreve histórico.
 */
export function AdminPlans() {
  const { data, isPending } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PlanRow[]> => {
      const res = await fetch("/api/admin/plans");
      if (!res.ok) throw new Error("forbidden");
      const json = (await res.json()) as { plans: PlanRow[] };
      return json.plans;
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Mudar o preço vale do próximo ciclo. Plano sem “mostrar no cadastro”
          só é atribuído por você, na aba Empresas.
        </p>
        <CreatePlan />
      </div>

      {isPending ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-fg-secondary">
          Nenhum plano ainda. Crie o primeiro para atribuir às empresas.
        </p>
      ) : (
        <div className="border-line overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[length:var(--text-small-size)]">
            <thead className="text-fg-muted text-[length:var(--text-caption-size)]">
              <tr>
                <th className="px-3 py-2 font-medium">Plano</th>
                <th className="px-3 py-2 font-medium">Valor por mês</th>
                <th className="px-3 py-2 font-medium">Usuários</th>
                <th className="px-3 py-2 font-medium">No cadastro</th>
                <th className="px-3 py-2 font-medium">Ativo</th>
                <th className="px-3 py-2 font-medium">Empresas</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.map((plan) => (
                <PlanRowItem key={plan.id} plan={plan} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
