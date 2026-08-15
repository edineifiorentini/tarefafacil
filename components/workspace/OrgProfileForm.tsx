"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { DocumentInput } from "@/components/ui/DocumentInput";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useOrgProfile, useSaveOrgProfile } from "@/lib/queries/useOrgProfile";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Identidade da organização — é o "contratado" que sai impresso em todo
 * contrato. Só dono/admin edita (a RLS já garante); os demais veem em
 * modo leitura, porque o dado aparece no documento que eles geram.
 */
export function OrgProfileForm() {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: profile } = useOrgProfile(workspace.id);
  const save = useSaveOrgProfile(workspace.id);
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canEdit = myRole === "owner" || myRole === "admin";

  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [repName, setRepName] = useState("");
  const [repDocument, setRepDocument] = useState("");
  const [repRole, setRepRole] = useState("");

  // Os campos são preenchidos quando o perfil chega do servidor. O estado
  // local existe porque o formulário é controlado e só grava ao enviar.
  useEffect(() => {
    if (!profile) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLegalName(profile.legal_name ?? "");
    setDocument(profile.document ?? "");
    setStateRegistration(profile.state_registration ?? "");
    setAddress(profile.address ?? "");
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setRepName(profile.representative_name ?? "");
    setRepDocument(profile.representative_document ?? "");
    setRepRole(profile.representative_role ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        legal_name: legalName.trim() || null,
        document: document.trim() || null,
        state_registration: stateRegistration.trim() || null,
        address: address.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        representative_name: repName.trim() || null,
        representative_document: repDocument.trim() || null,
        representative_role: repRole.trim() || null,
      },
      {
        onSuccess: () => toast.show({ message: "Dados da organização salvos" }),
        onError: () => toast.show({ message: "Não foi possível salvar" }),
      }
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
          Dados da organização
        </h2>
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Aparecem como parte contratada nos contratos gerados.
        </p>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Razão social">
            <TextInput
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Empresa Ltda"
              aria-label="Razão social"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CNPJ">
              <DocumentInput
                value={document}
                onChange={setDocument}
                type="pj"
                aria-label="CNPJ da organização"
              />
            </Field>
            <Field label="Inscrição estadual">
              <TextInput
                value={stateRegistration}
                onChange={(e) => setStateRegistration(e.target.value)}
                placeholder="Isento, se for o caso"
                aria-label="Inscrição estadual"
              />
            </Field>
          </div>

          <Field label="Endereço">
            <Textarea
              autogrow
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade/UF, CEP"
              aria-label="Endereço da organização"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="E-mail da organização"
              />
            </Field>
            <Field label="Telefone">
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-label="Telefone da organização"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Quem assina">
              <TextInput
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Nome completo"
                aria-label="Nome do representante"
              />
            </Field>
            <Field label="CPF de quem assina">
              <DocumentInput
                value={repDocument}
                onChange={setRepDocument}
                type="pf"
                aria-label="CPF do representante"
              />
            </Field>
            <Field label="Cargo">
              <TextInput
                value={repRole}
                onChange={(e) => setRepRole(e.target.value)}
                placeholder="Ex.: Sócio-administrador"
                aria-label="Cargo do representante"
              />
            </Field>
          </div>

          {canEdit ? (
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={save.isPending}
              >
                Salvar dados
              </Button>
            </div>
          ) : (
            <p className="text-fg-muted text-[length:var(--text-caption-size)]">
              Só o dono e administradores podem alterar estes dados.
            </p>
          )}
        </form>
      </fieldset>
    </section>
  );
}
