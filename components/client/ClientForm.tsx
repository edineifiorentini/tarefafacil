"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { DocumentInput } from "@/components/ui/DocumentInput";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { documentLabel } from "@/lib/validation/document";
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
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
  const [address, setAddress] = useState(client?.address ?? "");
  const [repName, setRepName] = useState(client?.representative_name ?? "");
  const [repDocument, setRepDocument] = useState(
    client?.representative_document ?? ""
  );

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
      address: address.trim() || null,
      representative_name: repName.trim() || null,
      representative_document: repDocument.trim() || null,
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
        <Field label={documentLabel(type)}>
          <DocumentInput
            value={documentId}
            onChange={setDocumentId}
            type={type}
            aria-label={`${documentLabel(type)} do cliente`}
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

      {/* Identificação para contrato: sem isto o documento gerado fica
          incompleto do lado do contratante. */}
      <Field label="Endereço">
        <Textarea
          autogrow
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Rua, número, bairro, cidade/UF, CEP"
          aria-label="Endereço do cliente"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Representante legal">
          <TextInput
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            placeholder="Quem assina pelo cliente"
            aria-label="Nome do representante legal"
          />
        </Field>
        <Field label="CPF do representante">
          <DocumentInput
            value={repDocument}
            onChange={setRepDocument}
            type="pf"
            aria-label="CPF do representante legal"
          />
        </Field>
      </div>

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
