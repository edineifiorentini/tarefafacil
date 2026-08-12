"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

function ClientRowItem({ client }: { client: ClientRow }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [plan, setPlan] = useState<Plan>(client.plan);
  const [seats, setSeats] = useState(String(client.seat_limit));

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: client.id,
          plan,
          seat_limit: Number(seats),
        }),
      });
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      toast.show({ message: "Cliente atualizado" });
      void qc.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: () => toast.show({ message: "Não foi possível salvar" }),
  });

  const dirty =
    plan !== client.plan || Number(seats) !== client.seat_limit;
  const overCapacity = client.member_count > Number(seats || 0);

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
      <td className="px-3 py-2 text-right">
        <Button
          variant="secondary"
          size="sm"
          disabled={!dirty}
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          Salvar
        </Button>
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
          Clientes
        </h1>
        <p className="text-fg-secondary">
          Workspaces, planos e assentos. Alterações valem na hora.
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
