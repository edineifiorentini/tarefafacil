"use client";

import { IconPencil, IconTrash } from "@tabler/icons-react";
import { AlertDialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatCentsBRL } from "@/lib/finance/money";
import { useClients } from "@/lib/queries/useClients";
import {
  useDeals,
  useDeleteDeal,
  usePipelineStages,
} from "@/lib/queries/useDeals";
import { useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { DealForm } from "./DealForm";

function dataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-fg-muted w-32 shrink-0 text-[length:var(--text-caption-size)]">
        {rotulo}
      </span>
      <span className="text-fg min-w-0 flex-1 text-[length:var(--text-small-size)]">
        {valor}
      </span>
    </div>
  );
}

/** Painel lateral da negociação. Lê da lista já carregada pelo quadro. */
export function DealDetail({
  dealId,
  onClose,
}: {
  dealId: string;
  onClose: () => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: deals = [] } = useDeals(workspace.id);
  const { data: stages = [] } = usePipelineStages(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const excluir = useDeleteDeal(workspace.id);
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const deal = deals.find((d) => d.id === dealId);
  if (!deal) {
    return (
      <p className="text-fg-secondary p-4">
        Esta negociação não está mais no funil.
      </p>
    );
  }

  const cliente = clients.find((c) => c.id === deal.client_id);
  const etapa = stages.find((s) => s.id === deal.stage_id);
  const responsavel = members.find((m) => m.user_id === deal.responsible_id);

  if (editando) {
    return (
      <DealForm stages={stages} deal={deal} onDone={() => setEditando(false)} />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-fg text-[length:var(--text-h3-size)] font-semibold">
          {cliente?.fantasy_name || cliente?.name || "Sem cliente"}
        </p>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {deal.title}
        </p>
      </div>

      {deal.amount_cents !== null ? (
        <p className="tnum text-fg text-[length:var(--text-h3-size)] font-semibold">
          {formatCentsBRL(deal.amount_cents)}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Linha rotulo="Etapa" valor={etapa?.name ?? "—"} />
        <Linha
          rotulo="Responsável"
          valor={responsavel?.display_name ?? responsavel?.email ?? "Ninguém"}
        />
        <Linha
          rotulo="Previsão"
          valor={
            deal.expected_close_on
              ? dataLonga(`${deal.expected_close_on}T12:00:00`)
              : "Sem previsão"
          }
        />
        {deal.won_at ? (
          <Linha rotulo="Ganha em" valor={dataLonga(deal.won_at)} />
        ) : null}
        {deal.lost_at ? (
          <Linha rotulo="Perdida em" valor={dataLonga(deal.lost_at)} />
        ) : null}
        {deal.lost_reason ? (
          <Linha rotulo="Motivo" valor={deal.lost_reason} />
        ) : null}
        {cliente?.phone ? (
          <Linha rotulo="Telefone" valor={cliente.phone} />
        ) : null}
        {cliente?.email ? (
          <Linha rotulo="E-mail" valor={cliente.email} />
        ) : null}
      </div>

      {deal.notes ? (
        <div className="border-line bg-sunken rounded-md border p-3">
          <p className="text-fg text-[length:var(--text-small-size)] whitespace-pre-wrap">
            {deal.notes}
          </p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={IconPencil}
          onClick={() => setEditando(true)}
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={IconTrash}
          onClick={() => setConfirmar(true)}
        >
          Excluir
        </Button>
      </div>

      <AlertDialog.Root open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
            <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
              Excluir esta negociação?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-fg-secondary mt-2">
              O cliente continua cadastrado; some só o registro desta
              negociação. Para guardar o histórico, mova para “Perdido” em vez
              de excluir.
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
                    excluir.mutate(deal.id, {
                      onSuccess: () => {
                        toast.show({ message: "Negociação excluída" });
                        onClose();
                      },
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
    </div>
  );
}
