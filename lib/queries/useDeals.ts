"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { outcomeFor } from "@/lib/crm/deals";
import { createClient } from "@/lib/supabase/client";
import type { Deal, PipelineStage } from "@/types/database";

const DEALS = "deals";
const STAGES = "pipelineStages";

function dealsKey(workspaceId: string) {
  return [DEALS, workspaceId] as const;
}
function stagesKey(workspaceId: string) {
  return [STAGES, workspaceId] as const;
}

export function usePipelineStages(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: stagesKey(workspaceId),
    queryFn: async (): Promise<PipelineStage[]> => {
      const { data, error } = await supabase
        .from("pipeline_stage")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeals(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: dealsKey(workspaceId),
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from("deal")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type NewDeal = {
  clientId: string;
  stageId: string;
  title: string;
  amountCents: number | null;
  responsibleId: string | null;
  expectedCloseOn: string | null;
  notes: string | null;
};

export function useCreateDeal(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewDeal): Promise<Deal> => {
      // Entra no topo da coluna: o lead novo é o que precisa de atenção.
      const atuais = qc.getQueryData<Deal[]>(dealsKey(workspaceId)) ?? [];
      const naEtapa = atuais.filter((d) => d.stage_id === input.stageId);
      const menor = naEtapa.reduce(
        (min, d) => Math.min(min, d.position),
        Number.POSITIVE_INFINITY
      );
      const position = Number.isFinite(menor) ? menor - 1 : 0;

      const { data, error } = await supabase
        .from("deal")
        .insert({
          workspace_id: workspaceId,
          client_id: input.clientId,
          stage_id: input.stageId,
          title: input.title,
          amount_cents: input.amountCents,
          responsible_id: input.responsibleId,
          expected_close_on: input.expectedCloseOn,
          notes: input.notes,
          position,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dealsKey(workspaceId) });
    },
  });
}

export function useUpdateDeal(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<
          Deal,
          | "title"
          | "amount_cents"
          | "client_id"
          | "responsible_id"
          | "expected_close_on"
          | "notes"
          | "lost_reason"
        >
      >;
    }) => {
      const { error } = await supabase.from("deal").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: dealsKey(workspaceId) });
      const antes = qc.getQueryData<Deal[]>(dealsKey(workspaceId));
      qc.setQueryData<Deal[]>(dealsKey(workspaceId), (data) =>
        data?.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(dealsKey(workspaceId), ctx.antes);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: dealsKey(workspaceId) });
    },
  });
}

/**
 * Move a negociação de etapa.
 *
 * O desfecho vem do `kind` da etapa de destino, não do nome dela. E quando a
 * etapa é de ganho, o cliente passa a "ativo" — foi a decisão do dono para
 * esta primeira rodada: fechar marca o ganho e promove o prospecto, e nada
 * além disso acontece sozinho.
 */
export function useMoveDeal(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      stage,
      position,
      clientId,
    }: {
      id: string;
      stage: PipelineStage | undefined;
      position: number;
      clientId: string;
    }) => {
      const desfecho = outcomeFor(stage);
      const { error } = await supabase
        .from("deal")
        .update({
          stage_id: stage?.id,
          position,
          won_at: desfecho.won_at,
          lost_at: desfecho.lost_at,
        })
        .eq("id", id);
      if (error) throw error;

      if (stage?.kind === "ganho") {
        // Só promove quem ainda não é cliente de verdade. Cliente pausado ou
        // encerrado que fecha uma negociação nova volta a ativo; quem já
        // estava ativo não muda.
        const { error: cErr } = await supabase
          .from("client")
          .update({ status: "ativo" })
          .eq("id", clientId)
          .neq("status", "ativo");
        if (cErr) throw cErr;
      }
    },
    onMutate: async ({ id, stage, position }) => {
      await qc.cancelQueries({ queryKey: dealsKey(workspaceId) });
      const antes = qc.getQueryData<Deal[]>(dealsKey(workspaceId));
      const desfecho = outcomeFor(stage);
      qc.setQueryData<Deal[]>(dealsKey(workspaceId), (data) =>
        data?.map((d) =>
          d.id === id
            ? {
                ...d,
                stage_id: stage?.id ?? d.stage_id,
                position,
                won_at: desfecho.won_at,
                lost_at: desfecho.lost_at,
              }
            : d
        )
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(dealsKey(workspaceId), ctx.antes);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: dealsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: ["clients", workspaceId] });
    },
  });
}

export function useDeleteDeal(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dealsKey(workspaceId) });
    },
  });
}

// ---------------------------------------------------------------------
// Etapas. Mesmo conjunto de ações que as colunas do quadro de demandas —
// o `Board` já oferece os controles quando recebe os callbacks.
// ---------------------------------------------------------------------

export function useCreateStage(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const atuais =
        qc.getQueryData<PipelineStage[]>(stagesKey(workspaceId)) ?? [];
      // Entra antes das etapas de desfecho: coluna nova depois de "Perdido"
      // seria uma etapa para onde nada caminha.
      const abertas = atuais.filter((s) => s.kind === "aberta");
      const position = abertas.length;
      const { error } = await supabase.from("pipeline_stage").insert({
        workspace_id: workspaceId,
        name,
        position,
      });
      if (error) throw error;

      // Empurra ganho e perdido para o fim, mantendo a ordem entre eles.
      const desfechos = atuais.filter((s) => s.kind !== "aberta");
      await Promise.all(
        desfechos.map((s, i) =>
          supabase
            .from("pipeline_stage")
            .update({ position: position + 1 + i })
            .eq("id", s.id)
        )
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: stagesKey(workspaceId) });
    },
  });
}

export function useRenameStage(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("pipeline_stage")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: stagesKey(workspaceId) });
      const antes = qc.getQueryData<PipelineStage[]>(stagesKey(workspaceId));
      qc.setQueryData<PipelineStage[]>(stagesKey(workspaceId), (data) =>
        data?.map((s) => (s.id === id ? { ...s, name } : s))
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(stagesKey(workspaceId), ctx.antes);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: stagesKey(workspaceId) });
    },
  });
}

export function useDeleteStage(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pipeline_stage")
        .delete()
        .eq("id", id);
      // 23503 = foreign_key_violation: a etapa ainda tem negociação dentro.
      // O banco recusa (on delete restrict) para o card não sumir do quadro
      // e continuar vivo no banco.
      if (error) {
        throw new Error(
          (error as { code?: string }).code === "23503"
            ? "stage_in_use"
            : error.message
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: stagesKey(workspaceId) });
    },
  });
}

export function useReorderStage(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: "left" | "right" }) => {
      const atuais =
        qc.getQueryData<PipelineStage[]>(stagesKey(workspaceId)) ?? [];
      const ordenadas = [...atuais].sort((a, b) => a.position - b.position);
      const i = ordenadas.findIndex((s) => s.id === id);
      const j = dir === "left" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= ordenadas.length) return;

      const a = ordenadas[i];
      const b = ordenadas[j];
      const { error } = await supabase
        .from("pipeline_stage")
        .update({ position: b.position })
        .eq("id", a.id);
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("pipeline_stage")
        .update({ position: a.position })
        .eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: stagesKey(workspaceId) });
    },
  });
}
