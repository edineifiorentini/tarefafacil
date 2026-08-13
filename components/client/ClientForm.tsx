"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useCreateClient, useUpdateClient } from "@/lib/queries/useClients";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Client, ClientStatus, ClientType } from "@/types/database";

const TYPES = [
  { value: "pj", label: "Pessoa jurídica" },
  { value: "pf", label: "Pessoa física" },
];
const STATUSES = [
  { value: "prospecto", label: "Prospecto" },
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado" },
  { value: "encerrado", label: "Encerrado" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[length:var(--text-caption-size)] font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ClientForm({
  mode,
  client,
  onDone,
}: {
  mode: "create" | "edit";
  client?: Client;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const create = useCreateClient(workspace.id);
  const update = useUpdateClient(workspace.id);

  const [type, setType] = useState<ClientType>(client?.type ?? "pj");
  const [name, setName] = useState(client?.name ?? "");
  const [fantasy, setFantasy] = useState(client?.fantasy_name ?? "");
  const [documentId, setDocumentId] = useState(client?.document ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? "ativo");
  const [notes, setNotes] = useState(client?.notes ?? "");

  const busy = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      type,
      name: name.trim(),
      fantasy_name: fantasy.trim() || null,
      document: documentId.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      status,
      notes: notes.trim() || null,
    };
    const handlers = {
      onSuccess: () => {
        toast.show({
          message: mode === "create" ? "Cliente criado" : "Cliente atualizado",
        });
        onDone();
      },
      onError: () => toast.show({ message: "Não foi possível salvar" }),
    };
    if (mode === "create") create.mutate(payload, handlers);
    else if (client) update.mutate({ id: client.id, patch: payload }, handlers);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select
            options={TYPES}
            value={type}
            onValueChange={(v) => setType(v as ClientType)}
            aria-label="Tipo"
          />
        </Field>
        <Field label="Situação">
          <Select
            options={STATUSES}
            value={status}
            onValueChange={(v) => setStatus(v as ClientStatus)}
            aria-label="Situação"
          />
        </Field>
      </div>

      <Field label={type === "pj" ? "Razão social" : "Nome"}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "pj" ? "Empresa Ltda" : "Nome completo"}
          aria-label="Nome"
        />
      </Field>

      {type === "pj" ? (
        <Field label="Nome fantasia">
          <TextInput
            value={fantasy}
            onChange={(e) => setFantasy(e.target.value)}
            aria-label="Nome fantasia"
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={type === "pj" ? "CNPJ" : "CPF"}>
          <TextInput
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            aria-label="Documento"
          />
        </Field>
        <Field label="Telefone">
          <TextInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Telefone"
          />
        </Field>
      </div>

      <Field label="E-mail">
        <TextInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="E-mail"
        />
      </Field>

      <Field label="Observações">
        <Textarea
          autogrow
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas internas sobre o cliente"
          aria-label="Observações"
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={busy}>
          {mode === "create" ? "Criar cliente" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
