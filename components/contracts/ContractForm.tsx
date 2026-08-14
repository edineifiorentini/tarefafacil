"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatCentsBRL, parseCurrencyToCents } from "@/lib/finance/money";
import { useClients } from "@/lib/queries/useClients";
import { useCreateContract, useUpdateContract } from "@/lib/queries/useContracts";
import { useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { BillingPeriod, Contract, ContractStatus } from "@/types/database";

const STATUSES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "assinado", label: "Assinado" },
  { value: "ativo", label: "Ativo" },
  { value: "encerrado", label: "Encerrado" },
  { value: "cancelado", label: "Cancelado" },
];
const PERIODS = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
  { value: "unico", label: "Pagamento único" },
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

export function ContractForm({
  mode,
  contract,
  onDone,
}: {
  mode: "create" | "edit";
  contract?: Contract;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: clients = [] } = useClients(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const create = useCreateContract(workspace.id);
  const update = useUpdateContract(workspace.id);

  const [number, setNumber] = useState(contract?.number ?? "");
  const [clientId, setClientId] = useState(contract?.client_id ?? "");
  const [responsibleId, setResponsibleId] = useState(contract?.responsible_id ?? "__none__");
  const [title, setTitle] = useState(contract?.title ?? "");
  const [description, setDescription] = useState(contract?.description ?? "");
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? "rascunho");
  const [issuedOn, setIssuedOn] = useState(contract?.issued_on ?? "");
  const [startsOn, setStartsOn] = useState(contract?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(contract?.ends_on ?? "");
  const [autoRenew, setAutoRenew] = useState(contract?.auto_renew ?? false);
  const [renewNoticeDays, setRenewNoticeDays] = useState(
    contract?.renew_notice_days ? String(contract.renew_notice_days) : ""
  );
  const [amount, setAmount] = useState(
    contract?.amount_cents ? formatCentsBRL(contract.amount_cents).replace(/[^\d,]/g, "") : ""
  );
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    contract?.billing_period ?? "mensal"
  );
  const [paymentMethod, setPaymentMethod] = useState(contract?.payment_method ?? "");
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [signedAt, setSignedAt] = useState(contract?.signed_at ?? "");
  const [signedDocumentUrl, setSignedDocumentUrl] = useState(
    contract?.signed_document_url ?? ""
  );

  const busy = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientId) {
      toast.show({ message: "Preencha o título do serviço e o cliente" });
      return;
    }
    const cents = amount.trim() ? parseCurrencyToCents(amount) : null;
    const payload = {
      number: number.trim() || null,
      client_id: clientId,
      responsible_id: responsibleId === "__none__" ? null : responsibleId,
      title: title.trim(),
      description: description.trim() || null,
      status,
      issued_on: issuedOn || null,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      auto_renew: autoRenew,
      renew_notice_days: autoRenew && renewNoticeDays ? Number.parseInt(renewNoticeDays, 10) : null,
      amount_cents: cents,
      billing_period: billingPeriod,
      payment_method: paymentMethod.trim() || null,
      notes: notes.trim() || null,
      signed_at: signedAt || null,
      signed_document_url: signedDocumentUrl.trim() || null,
    };
    const handlers = {
      onSuccess: () => {
        toast.show({
          message: mode === "create" ? "Contrato criado" : "Contrato atualizado",
        });
        onDone();
      },
      onError: () => toast.show({ message: "Não foi possível salvar" }),
    };
    if (mode === "create") create.mutate(payload, handlers);
    else if (contract) update.mutate({ id: contract.id, patch: payload }, handlers);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número">
          <TextInput
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Ex.: CT-0001"
            aria-label="Número do contrato"
          />
        </Field>
        <Field label="Situação">
          <Select
            options={STATUSES}
            value={status}
            onValueChange={(v) => setStatus(v as ContractStatus)}
            aria-label="Situação"
          />
        </Field>
      </div>

      <Field label="Cliente">
        <Select
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onValueChange={setClientId}
          aria-label="Cliente"
        />
      </Field>

      <Field label="Título do serviço">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Manutenção mensal de site"
          aria-label="Título do serviço"
        />
      </Field>

      <Field label="Descrição / escopo">
        <Textarea
          autogrow
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que será entregue…"
          aria-label="Descrição"
        />
      </Field>

      <Field label="Responsável interno">
        <Select
          options={[
            { value: "__none__", label: "Ninguém" },
            ...members.map((m) => ({ value: m.user_id, label: m.display_name ?? m.email })),
          ]}
          value={responsibleId}
          onValueChange={setResponsibleId}
          aria-label="Responsável interno"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Emissão">
          <TextInput
            type="date"
            value={issuedOn ?? ""}
            onChange={(e) => setIssuedOn(e.target.value)}
            aria-label="Data de emissão"
          />
        </Field>
        <Field label="Início da vigência">
          <TextInput
            type="date"
            value={startsOn ?? ""}
            onChange={(e) => setStartsOn(e.target.value)}
            aria-label="Início da vigência"
          />
        </Field>
        <Field label="Fim da vigência">
          <TextInput
            type="date"
            value={endsOn ?? ""}
            onChange={(e) => setEndsOn(e.target.value)}
            aria-label="Fim da vigência"
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={autoRenew}
          onCheckedChange={(c) => setAutoRenew(c === true)}
          aria-label="Renovação automática"
        />
        <span className="text-[length:var(--text-small-size)] text-fg">
          Renovação automática
        </span>
        {autoRenew ? (
          <div className="ml-2 w-28">
            <TextInput
              inputMode="numeric"
              value={renewNoticeDays}
              onChange={(e) => setRenewNoticeDays(e.target.value.replace(/\D/g, ""))}
              placeholder="dias de aviso"
              aria-label="Dias de aviso prévio"
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Valor (R$)">
          <TextInput
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            aria-label="Valor"
          />
        </Field>
        <Field label="Periodicidade">
          <Select
            options={PERIODS}
            value={billingPeriod}
            onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}
            aria-label="Periodicidade"
          />
        </Field>
        <Field label="Forma de pagamento">
          <TextInput
            value={paymentMethod ?? ""}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Ex.: Pix, boleto…"
            aria-label="Forma de pagamento"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data da assinatura">
          <TextInput
            type="date"
            value={signedAt ?? ""}
            onChange={(e) => setSignedAt(e.target.value)}
            aria-label="Data da assinatura"
          />
        </Field>
        <Field label="Link do documento assinado">
          <TextInput
            value={signedDocumentUrl ?? ""}
            onChange={(e) => setSignedDocumentUrl(e.target.value)}
            placeholder="https://…"
            aria-label="Link do documento assinado"
          />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea
          autogrow
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cláusulas adicionais, notas internas…"
          aria-label="Observações"
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={busy}>
          {mode === "create" ? "Criar contrato" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
