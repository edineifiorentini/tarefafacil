"use client";

import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { DocumentInput } from "@/components/ui/DocumentInput";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { buscarCep, buscarCnpj, maskCep } from "@/lib/lookup/fetchers";
import { isCnpj, onlyDigits } from "@/lib/lookup/types";
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
  const [zipCode, setZipCode] = useState(client?.zip_code ?? "");
  const [street, setStreet] = useState(client?.street ?? "");
  const [number, setNumber] = useState(client?.number ?? "");
  const [complement, setComplement] = useState(client?.complement ?? "");
  const [district, setDistrict] = useState(client?.district ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [state, setState] = useState(client?.state ?? "");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [repName, setRepName] = useState(client?.representative_name ?? "");
  const [repDocument, setRepDocument] = useState(
    client?.representative_document ?? ""
  );

  const busy = create.isPending || update.isPending;

  /** CEP preenche o que a pessoa não digitou; nunca sobrescreve o que ela
      já escreveu — número e complemento o serviço nem devolve. */
  async function preencherPeloCep(digits: string) {
    const r = await buscarCep(digits);
    if (!r) {
      toast.show({ message: "CEP não encontrado. Preencha à mão." });
      return;
    }
    if (r.street) setStreet(r.street);
    if (r.district) setDistrict(r.district);
    if (r.city) setCity(r.city);
    if (r.state) setState(r.state);
  }

  /** CNPJ preenche o cadastro inteiro — é o ganho de verdade da consulta. */
  async function preencherPeloCnpj() {
    if (!isCnpj(documentId)) return;
    setBuscandoCnpj(true);
    try {
      const r = await buscarCnpj(documentId);
      if (!r) {
        toast.show({ message: "CNPJ não encontrado na Receita" });
        return;
      }
      if (r.name) setName(r.name);
      if (r.fantasyName) setFantasy(r.fantasyName);
      if (r.email && !email.trim()) setEmail(r.email);
      if (r.phone && !phone.trim()) setPhone(r.phone);
      if (r.zipCode) setZipCode(r.zipCode);
      if (r.street) setStreet(r.street);
      if (r.number) setNumber(r.number);
      if (r.complement) setComplement(r.complement);
      if (r.district) setDistrict(r.district);
      if (r.city) setCity(r.city);
      if (r.state) setState(r.state);

      // Situação cadastral vale o aviso: fechar contrato com CNPJ baixado
      // costuma aparecer só quando a nota é recusada.
      const situacao = r.status?.toUpperCase();
      toast.show({
        message:
          situacao && situacao !== "ATIVA"
            ? `Dados preenchidos. Atenção: situação na Receita é "${r.status}".`
            : "Dados preenchidos pela Receita",
      });
    } finally {
      setBuscandoCnpj(false);
    }
  }

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
      zip_code: zipCode || null,
      street: street.trim() || null,
      number: number.trim() || null,
      complement: complement.trim() || null,
      district: district.trim() || null,
      city: city.trim() || null,
      state: state.trim().toUpperCase() || null,
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
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <DocumentInput
                value={documentId}
                onChange={setDocumentId}
                type={type}
                aria-label={`${documentLabel(type)} do cliente`}
              />
            </div>
            {/* Só CNPJ. CPF não tem consulta pública legítima — o que dá
                para fazer com ele é validar o dígito, que o DocumentInput
                já faz. */}
            {type === "pj" ? (
              <button
                type="button"
                onClick={() => void preencherPeloCnpj()}
                disabled={!isCnpj(documentId) || buscandoCnpj}
                aria-label="Buscar dados pelo CNPJ"
                className="border-line bg-card text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconSearch size={16} stroke={1.75} />
              </button>
            ) : null}
          </div>
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
          incompleto do lado do contratante. O CEP preenche o resto. */}
      <div className="grid grid-cols-[10rem_1fr] gap-3">
        <Field label="CEP">
          <TextInput
            value={maskCep(zipCode)}
            inputMode="numeric"
            placeholder="00000-000"
            onChange={(e) => {
              const digits = onlyDigits(e.target.value).slice(0, 8);
              setZipCode(digits);
              // Busca sozinho ao completar os oito dígitos: pedir um clique
              // depois de digitar o CEP inteiro é trabalho a mais para
              // fazer o que já dava para fazer.
              if (digits.length === 8) void preencherPeloCep(digits);
            }}
            aria-label="CEP do cliente"
          />
        </Field>
        <Field label="Rua">
          <TextInput
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            aria-label="Rua"
          />
        </Field>
      </div>

      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <Field label="Número">
          <TextInput
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="s/n"
            aria-label="Número"
          />
        </Field>
        <Field label="Complemento">
          <TextInput
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
            placeholder="Sala, andar…"
            aria-label="Complemento"
          />
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_1fr_5rem] gap-3">
        <Field label="Bairro">
          <TextInput
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            aria-label="Bairro"
          />
        </Field>
        <Field label="Cidade">
          <TextInput
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Cidade"
          />
        </Field>
        <Field label="UF">
          <TextInput
            value={state}
            maxLength={2}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            aria-label="Estado"
          />
        </Field>
      </div>

      {/* Endereço antigo, de antes da 0058. Some assim que a pessoa
          preencher os campos novos — reparti-lo por adivinhação gravaria o
          erro. */}
      {address.trim() && !street.trim() ? (
        <Field label="Endereço anterior">
          <Textarea
            autogrow
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            aria-label="Endereço do cliente"
          />
        </Field>
      ) : null}

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
