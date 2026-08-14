"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { centsToMaskedInput, parseCurrencyToCents } from "@/lib/finance/money";
import { useClients } from "@/lib/queries/useClients";
import {
  useCreateFinanceEntry,
  useUpdateFinanceEntry,
} from "@/lib/queries/useFinance";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type {
  FinanceEntry,
  FinanceKind,
  FinanceStatus,
} from "@/types/database";

const KINDS = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
];
const STATUSES = [
  { value: "previsto", label: "Prevista" },
  { value: "confirmado", label: "Confirmada" },
  { value: "cancelado", label: "Cancelada" },
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

export function FinanceEntryForm({
  mode,
  entry,
  onDone,
}: {
  mode: "create" | "edit";
  entry?: FinanceEntry;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: clients = [] } = useClients(workspace.id);
  const create = useCreateFinanceEntry(workspace.id);
  const update = useUpdateFinanceEntry(workspace.id);

  const [kind, setKind] = useState<FinanceKind>(entry?.kind ?? "entrada");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [amount, setAmount] = useState(
    entry ? centsToMaskedInput(entry.amount_cents) : ""
  );
  const [status, setStatus] = useState<FinanceStatus>(
    entry?.status ?? "previsto"
  );
  const [dueDate, setDueDate] = useState(entry?.due_date ?? "");
  const [confirmedAt, setConfirmedAt] = useState(entry?.confirmed_at ?? "");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [clientId, setClientId] = useState(entry?.client_id ?? "__none__");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [needsInvoice, setNeedsInvoice] = useState(
    entry?.needs_invoice ?? false
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    entry?.invoice_number ?? ""
  );
  const [invoiceIssuedAt, setInvoiceIssuedAt] = useState(
    entry?.invoice_issued_at ?? ""
  );
  const [invoiceFileUrl, setInvoiceFileUrl] = useState(
    entry?.invoice_file_url ?? ""
  );

  const busy = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCurrencyToCents(amount);
    if (!description.trim() || !cents || !dueDate) {
      toast.show({ message: "Preencha descrição, valor e vencimento" });
      return;
    }
    const payload = {
      kind,
      description: description.trim(),
      amount_cents: cents,
      status,
      due_date: dueDate,
      confirmed_at: status === "confirmado" ? confirmedAt || dueDate : null,
      category: category.trim() || null,
      client_id: clientId === "__none__" ? null : clientId,
      notes: notes.trim() || null,
      needs_invoice: needsInvoice,
      invoice_number: invoiceNumber.trim() || null,
      invoice_issued_at: invoiceIssuedAt || null,
      invoice_file_url: invoiceFileUrl.trim() || null,
    };
    const handlers = {
      onSuccess: () => {
        toast.show({
          message:
            mode === "create" ? "Lançamento criado" : "Lançamento atualizado",
        });
        onDone();
      },
      onError: () => toast.show({ message: "Não foi possível salvar" }),
    };
    if (mode === "create") create.mutate(payload, handlers);
    else if (entry) update.mutate({ id: entry.id, patch: payload }, handlers);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select
            options={KINDS}
            value={kind}
            onValueChange={(v) => setKind(v as FinanceKind)}
            aria-label="Tipo"
          />
        </Field>
        <Field label="Situação">
          <Select
            options={STATUSES}
            value={status}
            onValueChange={(v) => setStatus(v as FinanceStatus)}
            aria-label="Situação"
          />
        </Field>
      </div>

      <Field label="Descrição">
        <TextInput
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: Mensalidade cliente ACME"
          aria-label="Descrição"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            aria-label="Valor"
          />
        </Field>
        <Field label="Vencimento">
          <TextInput
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Vencimento"
          />
        </Field>
      </div>

      {status === "confirmado" ? (
        <Field
          label={
            kind === "entrada" ? "Data de recebimento" : "Data de pagamento"
          }
        >
          <TextInput
            type="date"
            value={confirmedAt || dueDate}
            onChange={(e) => setConfirmedAt(e.target.value)}
            aria-label="Data de confirmação"
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <TextInput
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: Ferramentas, Impostos…"
            aria-label="Categoria"
          />
        </Field>
        <Field label="Cliente">
          <Select
            options={[
              { value: "__none__", label: "Nenhum" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={clientId}
            onValueChange={setClientId}
            aria-label="Cliente"
          />
        </Field>
      </div>

      <Field label="Observações">
        <Textarea
          autogrow
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas internas sobre o lançamento"
          aria-label="Observações"
        />
      </Field>

      <div className="border-line flex flex-col gap-3 rounded-md border p-3">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={needsInvoice}
            onCheckedChange={(c) => setNeedsInvoice(c === true)}
            aria-label="Precisa de nota fiscal"
          />
          <span className="text-fg text-[length:var(--text-small-size)]">
            Precisa de nota fiscal
          </span>
        </label>

        {needsInvoice ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nº da nota">
              <TextInput
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Preencha ao emitir"
                aria-label="Número da nota fiscal"
              />
            </Field>
            <Field label="Data de emissão">
              <TextInput
                type="date"
                value={invoiceIssuedAt}
                onChange={(e) => setInvoiceIssuedAt(e.target.value)}
                aria-label="Data de emissão da nota"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Link do arquivo">
                <TextInput
                  value={invoiceFileUrl}
                  onChange={(e) => setInvoiceFileUrl(e.target.value)}
                  placeholder="https://…"
                  aria-label="Link do arquivo da nota fiscal"
                />
              </Field>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={busy}>
          {mode === "create" ? "Criar lançamento" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
