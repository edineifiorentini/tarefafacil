"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import type { ClientRow } from "@/lib/admin/types";
import type { Plan } from "@/types/database";

const PLANS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [
  { label: "Renovar 30 dias", days: 30 },
  { label: "Renovar 180 dias", days: 180 },
  { label: "Renovar 365 dias", days: 365 },
] as const;

const menuItem =
  "cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken";

function ClientRowItem({ client }: { client: ClientRow }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [plan, setPlan] = useState<Plan>(client.plan);
  const [seats, setSeats] = useState(String(client.seat_limit));
  const [confirmDelete, setConfirmDelete] = useState(false);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["admin-clients"] });
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: client.id, ...body }),
    });
    if (!res.ok) throw new Error("falha");
  }

  const save = useMutation({
    mutationFn: () => patch({ plan, seat_limit: Number(seats) }),
    onSuccess: () => {
      toast.show({ message: "Cliente atualizado" });
      invalidate();
    },
    onError: () => toast.show({ message: "Não foi possível salvar" }),
  });

  const renew = useMutation({
    mutationFn: (days: number | null) =>
      patch({
        access_expires_at:
          days === null
            ? null
            : new Date(Date.now() + days * DAY_MS).toISOString(),
        suspended: false,
      }),
    onSuccess: () => {
      toast.show({ message: "Acesso atualizado" });
      invalidate();
    },
    onError: () => toast.show({ message: "Não foi possível atualizar" }),
  });

  const setSuspended = useMutation({
    mutationFn: (suspended: boolean) => patch({ suspended }),
    onSuccess: (_d, suspended) => {
      toast.show({ message: suspended ? "Cliente bloqueado" : "Cliente liberado" });
      invalidate();
    },
    onError: () => toast.show({ message: "Não foi possível atualizar" }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/clients?id=${client.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Cliente removido" });
      invalidate();
    },
    onError: () => toast.show({ message: "Não foi possível remover" }),
  });

  const dirty = plan !== client.plan || Number(seats) !== client.seat_limit;
  const overCapacity = client.member_count > Number(seats || 0);
  const accessDate = client.access_expires_at
    ? new Date(client.access_expires_at).toLocaleDateString("pt-BR")
    : null;

  const accessLabel = client.suspended
    ? "Suspenso"
    : accessDate
      ? client.expired
        ? `Expirou ${accessDate}`
        : `Até ${accessDate}`
      : "Sem limite";
  const accessBad = client.suspended || client.expired;

  return (
    <tr className="border-t border-line">
      <td className="px-3 py-2">
        <div className="flex flex-col">
          <span className="text-fg">{client.name}</span>
          <span className="text-[length:var(--text-caption-size)] text-fg-muted">
            {client.owner_email ?? "—"}
          </span>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className={`tnum ${overCapacity ? "text-overdue" : "text-fg"}`}>
          {client.member_count}/{seats || 0}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="w-28">
          <Select
            options={PLANS}
            value={plan}
            onValueChange={(v) => setPlan(v as Plan)}
            aria-label={`Plano de ${client.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="w-20">
          <TextInput
            type="number"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            aria-label={`Assentos de ${client.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <span
          className={`text-[length:var(--text-caption-size)] ${
            accessBad ? "text-overdue" : "text-fg-secondary"
          }`}
        >
          {accessLabel}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!dirty}
            isLoading={save.isPending}
            onClick={() => save.mutate()}
          >
            Salvar
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Ações de ${client.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-sunken hover:text-fg data-[state=open]:bg-sunken"
              >
                <IconDotsVertical size={16} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-48 overflow-hidden rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
              >
                {PERIODS.map((p) => (
                  <DropdownMenu.Item
                    key={p.days}
                    onSelect={() => renew.mutate(p.days)}
                    className={menuItem}
                  >
                    {p.label}
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Item
                  onSelect={() => renew.mutate(null)}
                  className={menuItem}
                >
                  Acesso sem limite
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                {client.suspended ? (
                  <DropdownMenu.Item
                    onSelect={() => setSuspended.mutate(false)}
                    className={menuItem}
                  >
                    Desbloquear acesso
                  </DropdownMenu.Item>
                ) : (
                  <DropdownMenu.Item
                    onSelect={() => setSuspended.mutate(true)}
                    className={menuItem}
                  >
                    Bloquear acesso
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmDelete(true);
                  }}
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-overdue outline-none data-[highlighted]:bg-sunken"
                >
                  Remover cliente
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <AlertDialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-line bg-card p-5 text-left shadow-[var(--shadow-panel)]">
              <AlertDialog.Title className="text-[length:var(--text-h3-size)] font-semibold text-fg">
                Remover {client.name}?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-fg-secondary">
                Apaga o workspace e todos os dados dele (setores, tarefas,
                projetos, anexos), de forma permanente. A conta de login do dono
                não é apagada. Não dá para desfazer.
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
                    Remover
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

export function AdminClients() {
  const { data, isPending } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async (): Promise<ClientRow[]> => {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error("forbidden");
      const json = (await res.json()) as { clients: ClientRow[] };
      return json.clients;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
          Clientes
        </h1>
        <p className="text-fg-secondary">
          Workspaces, planos, assentos e acesso. Alterações valem na hora.
        </p>
      </div>

      {isPending ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-fg-secondary">Nenhum workspace ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-[length:var(--text-small-size)]">
            <thead className="text-[length:var(--text-caption-size)] text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Workspace</th>
                <th className="px-3 py-2 font-medium">Membros</th>
                <th className="px-3 py-2 font-medium">Plano</th>
                <th className="px-3 py-2 font-medium">Assentos</th>
                <th className="px-3 py-2 font-medium">Acesso</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <ClientRowItem key={c.id} client={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
