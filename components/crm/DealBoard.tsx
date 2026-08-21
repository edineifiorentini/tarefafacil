"use client";

import { IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { Board } from "@/components/board/Board";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { openTotalCents, stageTotals, winRate } from "@/lib/crm/deals";
import { formatCentsBRL } from "@/lib/finance/money";
import { useClients } from "@/lib/queries/useClients";
import {
  useCreateStage,
  useDeals,
  useDeleteStage,
  useMoveDeal,
  usePipelineStages,
  useRenameStage,
  useReorderStage,
  useUpdateDeal,
} from "@/lib/queries/useDeals";
import { useMembers } from "@/lib/queries/useMembers";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Deal } from "@/types/database";

import { DealCard } from "./DealCard";
import { DealDetail } from "./DealDetail";
import { DealForm } from "./DealForm";
import { LostReasonDialog } from "./LostReasonDialog";

// Etapa aberta cicla pela paleta; ganho e perdido têm tom fixo, porque são
// as duas colunas que a pessoa procura sem ler.
//
// Ganho fica CINZA, não verde. O `tokens.css` reserva o verde a dado
// financeiro positivo e o tira da paleta de coluna de propósito — e, no
// quadro, cinza já é a cor de "saiu do fluxo", que é o que ganhar significa
// aqui. Quem diz que a negociação foi ganha é o troféu no card e o valor no
// cabeçalho, não a cor da coluna. `rose` sai do rodízio para não colidir
// com a coluna de perda.
const TONES = ["violet", "blue", "amber", "cyan"];

export function DealBoard() {
  const workspace = useWorkspace();
  const toast = useToast();
  const { openPanel, closePanel } = useShell();

  const { data: stages = [], isLoading: carregandoEtapas } = usePipelineStages(
    workspace.id
  );
  const { data: deals = [], isLoading: carregandoDeals } = useDeals(
    workspace.id
  );
  const { data: clients = [] } = useClients(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);

  const mover = useMoveDeal(workspace.id);
  const atualizar = useUpdateDeal(workspace.id);
  const criarEtapa = useCreateStage(workspace.id);
  const renomearEtapa = useRenameStage(workspace.id);
  const excluirEtapa = useDeleteStage(workspace.id);
  const reordenarEtapa = useReorderStage(workspace.id);

  // Negociação recém-perdida, esperando o motivo. O arraste já aconteceu.
  const [perdida, setPerdida] = useState<Deal | null>(null);

  const clientePorId = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );
  const nomePorMembro = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.display_name ?? m.email])),
    [members]
  );
  const totais = useMemo(() => stageTotals(deals), [deals]);
  const emAberto = useMemo(
    () => openTotalCents(deals, stages),
    [deals, stages]
  );
  const conversao = useMemo(() => winRate(deals), [deals]);

  function abrirDetalhe(id: string) {
    openPanel({
      title: "Negociação",
      node: <DealDetail dealId={id} onClose={closePanel} />,
    });
  }

  function abrirNova(stageId?: string) {
    openPanel({
      title: "Nova negociação",
      node: (
        <DealForm
          stages={stages}
          defaultStageId={stageId}
          onDone={closePanel}
        />
      ),
    });
  }

  if (carregandoEtapas || carregandoDeals) {
    return <p className="text-fg-secondary">Carregando…</p>;
  }

  if (stages.length === 0) {
    return (
      <p className="text-fg-secondary">
        Este workspace ainda não tem etapas de funil.
      </p>
    );
  }

  let toneIndex = 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
            Em aberto
          </p>
          <p className="tnum text-fg text-[length:var(--text-h3-size)] font-semibold">
            {formatCentsBRL(emAberto)}
          </p>
        </div>
        {conversao !== null ? (
          <div>
            <p className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
              Conversão
            </p>
            <p className="tnum text-fg text-[length:var(--text-h3-size)] font-semibold">
              {conversao}%
            </p>
          </div>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          leadingIcon={IconPlus}
          onClick={() => abrirNova()}
        >
          Nova negociação
        </Button>
      </div>

      <Board<Deal>
        columns={stages.map((s) => {
          const t = totais.get(s.id);
          return {
            id: s.id,
            name: s.name,
            subtitle: formatCentsBRL(t?.cents ?? 0),
            tone:
              s.kind === "ganho"
                ? "neutral"
                : s.kind === "perdido"
                  ? "rose"
                  : TONES[toneIndex++ % TONES.length],
          };
        })}
        items={deals}
        getItemId={(d) => d.id}
        getColumnId={(d) => d.stage_id}
        getPosition={(d) => d.position}
        getItemLabel={(d) => d.title}
        renderCard={(d) => (
          <DealCard
            deal={d}
            client={clientePorId.get(d.client_id)}
            responsibleName={
              d.responsible_id ? nomePorMembro.get(d.responsible_id) : null
            }
            onOpen={() => abrirDetalhe(d.id)}
          />
        )}
        onMove={(itemId, toColumnId, toPosition) => {
          const etapa = stages.find((s) => s.id === toColumnId);
          const negociacao = deals.find((d) => d.id === itemId);
          if (!negociacao) return;

          mover.mutate({
            id: itemId,
            stage: etapa,
            position: toPosition,
            clientId: negociacao.client_id,
          });

          if (etapa?.kind === "ganho") {
            toast.show({ message: "Negociação ganha. Cliente agora é ativo." });
          }
          // O motivo é perguntado depois: travar o arraste num formulário
          // faria a pessoa desistir de mover o card.
          if (etapa?.kind === "perdido") setPerdida(negociacao);
        }}
        emptyColumnSlot={(col) => (
          <button
            type="button"
            onClick={() => abrirNova(col.id)}
            className="text-fg-muted hover:bg-hover hover:text-fg w-full rounded-sm px-2 py-1.5 text-left text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)]"
          >
            + Negociação
          </button>
        )}
        onColumnCreate={(name) => criarEtapa.mutate(name)}
        onColumnRename={(id, name) => renomearEtapa.mutate({ id, name })}
        onColumnDelete={(id) =>
          excluirEtapa.mutate(id, {
            onError: (e) =>
              toast.show({
                message:
                  e instanceof Error && e.message === "stage_in_use"
                    ? "Esta etapa ainda tem negociações. Mova os cards antes de excluir."
                    : "Não foi possível excluir a etapa",
              }),
          })
        }
        onColumnReorder={(id, dir) => reordenarEtapa.mutate({ id, dir })}
      />

      <LostReasonDialog
        open={perdida !== null}
        dealTitle={perdida?.title ?? ""}
        onOpenChange={(v) => {
          if (!v) setPerdida(null);
        }}
        onSave={(reason) => {
          if (perdida) {
            atualizar.mutate({
              id: perdida.id,
              patch: { lost_reason: reason },
            });
          }
        }}
      />
    </div>
  );
}
