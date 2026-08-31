"use client";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  fraseDoQueSobrevive,
  pluralizar,
  podeExcluir,
} from "@/lib/clients/deletion";
import { useClientImpact, useDeleteClient } from "@/lib/queries/useClients";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Client } from "@/types/database";

/**
 * Exclusão de cliente.
 *
 * A regra vive em `lib/clients/deletion.ts` e é testada lá — aqui só tem
 * markup. O que ela decide, e por quê, está documentado junto da decisão.
 *
 * Em resumo: contrato bloqueia, porque `contract.client_id` é
 * `on delete cascade` e contrato é documento jurídico com o texto congelado
 * na assinatura.
 */
export function DeleteClientDialog({
  client,
  onDone,
}: {
  client: Client;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: impacto, isLoading } = useClientImpact(workspace.id, client.id);
  const del = useDeleteClient(workspace.id);

  if (isLoading || !impacto) {
    return <Skeleton variant="block" className="h-40" />;
  }

  const veredito = podeExcluir(impacto);

  if (!veredito.pode) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-fg-secondary">
          <strong className="text-fg">{client.name}</strong> tem{" "}
          <strong className="text-fg">
            {pluralizar(veredito.contratos, "contrato", "contratos")}
          </strong>
          . Excluir o cliente apagaria{" "}
          {veredito.contratos === 1 ? "ele" : "eles"} junto, de forma
          permanente.
        </p>
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          Para encerrar a relação sem perder o histórico, mude a situação do
          cliente para <strong>Encerrado</strong> em Editar.
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onDone}>
            Entendi
          </Button>
        </div>
      </div>
    );
  }

  const sobrevive = fraseDoQueSobrevive(impacto);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-secondary">
        Excluir <strong className="text-fg">{client.name}</strong> de forma
        permanente. Não dá para desfazer.
      </p>

      {veredito.apagaJunto > 0 ? (
        <p className="text-fg-secondary">
          <strong className="text-fg">
            {pluralizar(veredito.apagaJunto, "negociação", "negociações")}
          </strong>{" "}
          do funil {veredito.apagaJunto === 1 ? "será apagada" : "serão apagadas"}{" "}
          junto.
        </p>
      ) : null}

      {sobrevive ? (
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          {sobrevive}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          isLoading={del.isPending}
          onClick={() =>
            del.mutate(client.id, {
              onSuccess: () => {
                toast.show({ message: "Cliente excluído" });
                onDone();
              },
              onError: () =>
                toast.show({ message: "Não foi possível excluir" }),
            })
          }
        >
          Excluir cliente
        </Button>
      </div>
    </div>
  );
}
