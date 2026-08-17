"use client";

import { IconArchive, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  CONTRACT_VARIABLES,
  DEFAULT_TEMPLATE_BODY,
  unknownVariables,
} from "@/lib/contracts/template";
import {
  useArchiveContractTemplate,
  useContractTemplates,
  useCreateContractTemplate,
  useUpdateContractTemplate,
} from "@/lib/queries/useContractTemplates";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const GROUP_LABEL: Record<string, string> = {
  contrato: "Contrato",
  cliente: "Cliente",
  contratado: "Contratado",
  data: "Data",
};

/**
 * Editor de modelos (spec 9.4). O corpo é texto com marcadores — o painel
 * de variáveis à direita mostra o que existe e insere no cursor, para o
 * usuário não precisar decorar chave nenhuma.
 */
export function ContractTemplateManager() {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: templates = [] } = useContractTemplates(workspace.id);
  const create = useCreateContractTemplate(workspace.id);
  const update = useUpdateContractTemplate(workspace.id);
  const archive = useArchiveContractTemplate(workspace.id);
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canEdit = myRole === "owner" || myRole === "admin";

  const [selectedId, setSelectedId] = useState<string>("__new__");
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE_BODY);

  const selected = templates.find((t) => t.id === selectedId);
  const invalid = unknownVariables(body);

  function pick(id: string) {
    setSelectedId(id);
    if (id === "__new__") {
      setName("");
      setBody(DEFAULT_TEMPLATE_BODY);
      return;
    }
    const template = templates.find((t) => t.id === id);
    if (template) {
      setName(template.name);
      setBody(template.body);
    }
  }

  function insertVariable(key: string) {
    setBody((current) => `${current}{{${key}}}`);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.show({ message: "Dê um nome ao modelo" });
      return;
    }
    if (selected) {
      update.mutate(
        {
          id: selected.id,
          name: name.trim(),
          body,
          currentVersion: selected.version,
          bodyChanged: body !== selected.body,
        },
        {
          onSuccess: () => toast.show({ message: "Modelo atualizado" }),
          onError: () => toast.show({ message: "Não foi possível salvar" }),
        }
      );
      return;
    }
    create.mutate(
      { name: name.trim(), body },
      {
        onSuccess: () => {
          toast.show({ message: "Modelo criado" });
          setSelectedId("__new__");
          setName("");
          setBody(DEFAULT_TEMPLATE_BODY);
        },
        onError: () => toast.show({ message: "Não foi possível criar" }),
      }
    );
  }

  if (!canEdit) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
          Modelos de contrato
        </h2>
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          O texto usa marcadores que são preenchidos com os dados reais ao gerar
          o contrato. Contrato já enviado guarda o próprio texto e não muda
          quando o modelo é editado.
        </p>
      </div>

      <div className="w-full sm:w-72">
        <Select
          options={[
            { value: "__new__", label: "Novo modelo" },
            ...templates.map((t) => ({
              value: t.id,
              label: `${t.name} (v${t.version})`,
            })),
          ]}
          value={selectedId}
          onValueChange={pick}
          aria-label="Modelo em edição"
        />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Nome do modelo
          </span>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Prestação de serviços mensal"
            aria-label="Nome do modelo"
          />
        </label>

        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="flex flex-col gap-1">
            <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
              Texto do contrato
            </span>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              aria-label="Texto do modelo"
              className="font-mono text-[length:var(--text-caption-size)]"
            />
          </label>

          <div className="border-line bg-sunken flex max-h-96 flex-col gap-2 overflow-auto rounded-md border p-3">
            <p className="text-fg-secondary text-[length:var(--text-caption-size)] font-medium">
              Variáveis
            </p>
            {Object.entries(
              CONTRACT_VARIABLES.reduce<
                Record<string, typeof CONTRACT_VARIABLES>
              >((acc, v) => {
                (acc[v.group] ??= []).push(v);
                return acc;
              }, {})
            ).map(([group, items]) => (
              <div key={group} className="flex flex-col gap-1">
                <span className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
                  {GROUP_LABEL[group] ?? group}
                </span>
                {items.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(variable.key)}
                    title={`Inserir {{${variable.key}}}`}
                    className="hover:bg-hover text-fg-secondary hover:text-fg truncate rounded-xs px-1.5 py-1 text-left text-[length:var(--text-caption-size)]"
                  >
                    {variable.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {invalid.length > 0 ? (
          <p
            role="alert"
            className="text-overdue text-[length:var(--text-caption-size)]"
          >
            Marcador não reconhecido: {invalid.join(", ")}. Ele vai aparecer
            como erro no documento.
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {selected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leadingIcon={IconArchive}
              onClick={() =>
                archive.mutate(selected.id, {
                  onSuccess: () => {
                    toast.show({ message: "Modelo arquivado" });
                    pick("__new__");
                  },
                })
              }
            >
              Arquivar
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leadingIcon={selected ? undefined : IconPlus}
            isLoading={create.isPending || update.isPending}
          >
            {selected ? "Salvar modelo" : "Criar modelo"}
          </Button>
        </div>
      </form>
    </section>
  );
}
