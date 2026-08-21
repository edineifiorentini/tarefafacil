"use client";

import { IconBriefcase, IconPlus, IconTrash } from "@tabler/icons-react";
import { AlertDialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { centsToMaskedInput, parseCurrencyToCents } from "@/lib/finance/money";
import {
  useCreateService,
  useDeleteService,
  useServices,
  useUpdateService,
} from "@/lib/queries/useServices";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Service } from "@/types/database";

// Preço zero é legítimo (cortesia, bônus), então o null do parser vira 0.
function centsOf(masked: string): number {
  return parseCurrencyToCents(masked) ?? 0;
}

function ServiceRow({ service }: { service: Service }) {
  const workspace = useWorkspace();
  const toast = useToast();
  const atualizar = useUpdateService(workspace.id);
  const excluir = useDeleteService(workspace.id);
  const [name, setName] = useState(service.name);
  const [preco, setPreco] = useState(centsToMaskedInput(service.price_cents));
  const [unit, setUnit] = useState(service.unit ?? "");
  const [confirmar, setConfirmar] = useState(false);

  const mudou =
    name.trim() !== service.name ||
    centsOf(preco) !== service.price_cents ||
    (unit.trim() || null) !== service.unit;
  const valido = name.trim().length > 0;

  return (
    <tr className="border-line border-t">
      <td className="px-3 py-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Nome do serviço ${service.name}`}
        />
      </td>
      <td className="w-40 px-3 py-2">
        <CurrencyInput
          value={preco}
          onChange={setPreco}
          aria-label={`Preço de ${service.name}`}
        />
      </td>
      <td className="w-32 px-3 py-2">
        <TextInput
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="por mês"
          aria-label={`Unidade de ${service.name}`}
        />
      </td>
      <td className="px-3 py-2">
        <label className="text-fg-secondary flex items-center gap-2 text-[length:var(--text-caption-size)]">
          <Checkbox
            checked={service.active}
            onCheckedChange={(c) =>
              atualizar.mutate({
                id: service.id,
                patch: { active: c === true },
              })
            }
            aria-label={`${service.name} ativo`}
          />
          Ativo
        </label>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!mudou || !valido}
            isLoading={atualizar.isPending}
            onClick={() =>
              atualizar.mutate(
                {
                  id: service.id,
                  patch: {
                    name: name.trim(),
                    price_cents: centsOf(preco),
                    unit: unit.trim() || null,
                  },
                },
                { onSuccess: () => toast.show({ message: "Serviço salvo" }) }
              )
            }
          >
            Salvar
          </Button>
          <button
            type="button"
            aria-label={`Excluir ${service.name}`}
            onClick={() => setConfirmar(true)}
            className="text-fg-muted hover:bg-hover hover:text-overdue inline-flex h-8 w-8 items-center justify-center rounded-sm"
          >
            <IconTrash size={16} stroke={1.5} />
          </button>
        </div>

        <AlertDialog.Root open={confirmar} onOpenChange={setConfirmar}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
              <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Excluir {service.name}?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-fg-secondary mt-2">
                Some da lista de escolha. Negociações e contratos que já usaram
                este serviço guardaram o nome e o valor da época — nada do que
                foi vendido muda. Se a ideia é só tirar de circulação, desmarque
                “Ativo”.
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
                    isLoading={excluir.isPending}
                    onClick={() =>
                      excluir.mutate(service.id, {
                        onSuccess: () =>
                          toast.show({ message: "Serviço excluído" }),
                        onError: () =>
                          toast.show({ message: "Não foi possível excluir" }),
                      })
                    }
                  >
                    Excluir
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

function CreateService() {
  const workspace = useWorkspace();
  const toast = useToast();
  const criar = useCreateService(workspace.id);
  const [aberto, setAberto] = useState(false);
  const [name, setName] = useState("");
  const [preco, setPreco] = useState("");
  const [unit, setUnit] = useState("");

  if (!aberto) {
    return (
      <Button
        variant="primary"
        size="sm"
        leadingIcon={IconPlus}
        onClick={() => setAberto(true)}
      >
        Novo serviço
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        criar.mutate(
          {
            name: name.trim(),
            priceCents: centsOf(preco),
            unit: unit.trim() || null,
            notes: null,
          },
          {
            onSuccess: () => {
              toast.show({ message: "Serviço cadastrado" });
              setName("");
              setPreco("");
              setUnit("");
              setAberto(false);
            },
            onError: () =>
              toast.show({ message: "Não foi possível cadastrar" }),
          }
        );
      }}
      className="border-line bg-card flex flex-wrap items-end gap-2 rounded-md border p-3"
    >
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Serviço
        <div className="w-64">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Identidade visual"
            aria-label="Nome do serviço"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Preço
        <div className="w-40">
          <CurrencyInput
            value={preco}
            onChange={setPreco}
            aria-label="Preço do serviço"
          />
        </div>
      </label>
      <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
        Unidade
        <div className="w-32">
          <TextInput
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="por mês"
            aria-label="Unidade do serviço"
          />
        </div>
      </label>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        disabled={!name.trim()}
        isLoading={criar.isPending}
      >
        Cadastrar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setAberto(false)}
      >
        Cancelar
      </Button>
    </form>
  );
}

/**
 * Catálogo do que a agência vende.
 *
 * O preço daqui é tabela, não contrato: editar não mexe em negociação,
 * contrato ou lançamento já feitos, que guardaram o número da época.
 */
export function ServicesView() {
  const workspace = useWorkspace();
  const { data: services = [], isPending } = useServices(workspace.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Mudar o preço vale das próximas vendas. O que já foi negociado guardou
          o valor da época.
        </p>
        <CreateService />
      </div>

      {isPending ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : services.length === 0 ? (
        <EmptyState
          icon={IconBriefcase}
          title="Nenhum serviço no catálogo"
          description="Cadastre o que você vende com mais frequência. No funil, escolher o serviço já preenche o título e o valor da negociação."
        />
      ) : (
        <div className="border-line overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[length:var(--text-small-size)]">
            <thead className="text-fg-muted text-[length:var(--text-caption-size)]">
              <tr>
                <th className="px-3 py-2 font-medium">Serviço</th>
                <th className="px-3 py-2 font-medium">Preço</th>
                <th className="px-3 py-2 font-medium">Unidade</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <ServiceRow key={s.id} service={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
