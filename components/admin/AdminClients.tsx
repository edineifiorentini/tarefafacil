"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, Dialog, DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import type { ClientRow, PlanRow } from "@/lib/admin/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [
  { label: "Renovar 30 dias", days: 30 },
  { label: "Renovar 180 dias", days: 180 },
  { label: "Renovar 365 dias", days: 365 },
] as const;

// Radix reserva "" para "sem valor", então "sem plano" precisa de um valor
// próprio no Select.
const SEM_PLANO = "none";

const menuItem =
  "cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-hover";

export function usePlanOptions() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async (): Promise<PlanRow[]> => {
      const res = await fetch("/api/admin/plans");
      if (!res.ok) throw new Error("forbidden");
      const json = (await res.json()) as { plans: PlanRow[] };
      return json.plans;
    },
  });
}

function ClientRowItem({
  client,
  plans,
}: {
  client: ClientRow;
  plans: PlanRow[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [planId, setPlanId] = useState(client.plan_id ?? SEM_PLANO);
  const [seats, setSeats] = useState(String(client.seat_limit));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editContact, setEditContact] = useState(false);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["admin-clients"] });
    void qc.invalidateQueries({ queryKey: ["admin-plans"] });
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: client.id, ...body }),
    });
    if (!res.ok) throw new Error("falha");
    return (await res.json()) as { workspace: { seat_limit: number } };
  }

  const planChanged = (planId === SEM_PLANO ? null : planId) !== client.plan_id;
  const seatsChanged = Number(seats) !== client.seat_limit;

  const save = useMutation({
    mutationFn: () =>
      patch({
        // Só manda o que mudou: com plano novo e assentos intocados, quem
        // define o limite é o plano (o servidor copia o max_users dele).
        ...(planChanged
          ? { plan_id: planId === SEM_PLANO ? null : planId }
          : {}),
        ...(seatsChanged ? { seat_limit: Number(seats) } : {}),
      }),
    onSuccess: (data) => {
      setSeats(String(data.workspace.seat_limit));
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
      toast.show({
        message: suspended ? "Cliente bloqueado" : "Cliente liberado",
      });
      invalidate();
    },
    onError: () => toast.show({ message: "Não foi possível atualizar" }),
  });

  const setTrial = useMutation({
    mutationFn: (trial: boolean) => patch({ trial }),
    onSuccess: (_d, trial) => {
      toast.show({ message: trial ? "Marcado como teste" : "Teste encerrado" });
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

  const dirty = planChanged || seatsChanged;
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

  // Plano inativo continua na lista enquanto for o plano desta empresa —
  // sumir dele faria o Select mostrar vazio para um cliente que tem plano.
  const planOptions = [
    { value: SEM_PLANO, label: "Sem plano" },
    ...plans
      .filter((p) => p.active || p.id === client.plan_id)
      .map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <tr className="border-line border-t">
      <td className="px-3 py-2">
        <div className="flex flex-col">
          <span className="text-fg flex items-center gap-2">
            {client.name}
            {client.trial ? (
              <span className="border-line text-fg-secondary rounded-full border px-1.5 py-0.5 text-[length:var(--text-caption-size)]">
                Em teste
              </span>
            ) : null}
          </span>
          <span className="text-fg-muted text-[length:var(--text-caption-size)]">
            {client.contact_email ?? client.owner_email ?? "—"}
            {client.contact_phone ? ` · ${client.contact_phone}` : ""}
          </span>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className={`tnum ${overCapacity ? "text-overdue" : "text-fg"}`}>
          {client.member_count}/{seats || 0}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="w-40">
          <Select
            options={planOptions}
            value={planId}
            onValueChange={setPlanId}
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
                className="text-fg-muted hover:bg-hover hover:text-fg data-[state=open]:bg-sunken inline-flex h-8 w-8 items-center justify-center rounded-sm"
              >
                <IconDotsVertical size={16} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="tf-glass-strong z-50 min-w-48 overflow-hidden rounded-md p-1 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
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
                <DropdownMenu.Separator className="bg-line my-1 h-px" />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setEditContact(true);
                  }}
                  className={menuItem}
                >
                  Editar contato
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setTrial.mutate(!client.trial)}
                  className={menuItem}
                >
                  {client.trial ? "Encerrar teste" : "Marcar como teste"}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="bg-line my-1 h-px" />
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
                <DropdownMenu.Separator className="bg-line my-1 h-px" />
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmDelete(true);
                  }}
                  className="text-overdue data-[highlighted]:bg-hover cursor-pointer rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                >
                  Remover cliente
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <ContactDialog
          client={client}
          open={editContact}
          onOpenChange={setEditContact}
          onSaved={invalidate}
        />

        <AlertDialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
              <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Remover {client.name}?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-fg-secondary mt-2">
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

// Contato de cobrança da empresa — quem recebe fatura e aviso de vencimento.
// Fica separado do e-mail de login: nem sempre quem paga é quem usa.
function ContactDialog({
  client,
  open,
  onOpenChange,
  onSaved,
}: {
  client: ClientRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(client.contact_email ?? "");
  const [phone, setPhone] = useState(client.contact_phone ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: client.id,
          contact_email: email,
          contact_phone: phone,
        }),
      });
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Contato atualizado" });
      onOpenChange(false);
      onSaved();
    },
    onError: () => toast.show({ message: "Não foi possível salvar" }),
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(26rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
          <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            Contato de {client.name}
          </Dialog.Title>
          <Dialog.Description className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
            Para onde vão fatura e aviso de vencimento.
          </Dialog.Description>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="mt-4 flex flex-col gap-3"
          >
            <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
              E-mail
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="financeiro@empresa.com"
                aria-label="E-mail de contato"
              />
            </label>
            <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
              Telefone
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                aria-label="Telefone de contato"
              />
            </label>
            <div className="mt-1 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={save.isPending}
              >
                Salvar
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CreateClient({ plans }: { plans: PlanRow[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
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
      void qc.invalidateQueries({ queryKey: ["admin-clients"] });
      void qc.invalidateQueries({ queryKey: ["admin-plans"] });
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
  const { data: plans = [] } = usePlanOptions();

  return (
    <div className="flex flex-col gap-4">
      {/* O título "Contas" está na barra superior; aqui fica só o aviso de
          comportamento e a ação de criar. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Alterações de plano, assentos e acesso valem na hora. Trocar o plano
          leva os assentos dele junto.
        </p>
        <CreateClient plans={plans} />
      </div>

      {isPending ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-fg-secondary">Nenhum workspace ainda.</p>
      ) : (
        <div className="border-line overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[length:var(--text-small-size)]">
            <thead className="text-fg-muted text-[length:var(--text-caption-size)]">
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
              {data.map((client) => (
                <ClientRowItem key={client.id} client={client} plans={plans} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
