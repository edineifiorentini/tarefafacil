"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_HORIZON,
  missingOccurrences,
  planOccurrences,
} from "@/lib/finance/recurrence";
import { createClient } from "@/lib/supabase/client";
import type { FinanceRecurrence } from "@/types/database";

/** Marca as ocorrências como vindas de recorrência — nunca colide com contrato. */
const SOURCE = "recurrence";

function recurrencesKey(workspaceId: string) {
  return ["financeRecurrences", workspaceId] as const;
}
function entriesKey(workspaceId: string) {
  return ["finance", workspaceId] as const;
}

export function useFinanceRecurrences(workspaceId: string, enabled = true) {
  const supabase = createClient();
  return useQuery({
    enabled,
    queryKey: recurrencesKey(workspaceId),
    queryFn: async (): Promise<FinanceRecurrence[]> => {
      const { data, error } = await supabase
        .from("finance_recurrence")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type NewRecurrence = {
  kind: "entrada" | "saida";
  description: string;
  amountCents: number;
  frequency: "mensal" | "trimestral" | "anual";
  startsOn: string;
  endsOn: string | null;
  category: string | null;
  clientId: string | null;
};

export function useCreateRecurrence(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRecurrence): Promise<FinanceRecurrence> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("finance_recurrence")
        .insert({
          workspace_id: workspaceId,
          kind: input.kind,
          description: input.description,
          amount_cents: input.amountCents,
          frequency: input.frequency,
          starts_on: input.startsOn,
          ends_on: input.endsOn,
          category: input.category,
          client_id: input.clientId,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: recurrencesKey(workspaceId) }),
  });
}

/**
 * Gera as ocorrências que faltam.
 *
 * Lê o que já existe, calcula o que deveria existir e insere só a
 * diferença. Rodar duas vezes seguidas não duplica nada — nem por causa
 * desta conta, nem por acaso: o índice único de (source_type, source_id,
 * installment_number) é a garantia de verdade, esta conta só evita bater
 * nele à toa.
 */
export function useGenerateOccurrences(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recurrence,
      horizon = DEFAULT_HORIZON,
    }: {
      recurrence: FinanceRecurrence;
      horizon?: number;
    }): Promise<number> => {
      const { data: existentes, error: e1 } = await supabase
        .from("finance_entry")
        .select("installment_number")
        .eq("source_type", SOURCE)
        .eq("source_id", recurrence.id);
      if (e1) throw e1;

      const numeros = existentes
        .map((e) => e.installment_number)
        .filter((n): n is number => n !== null);

      const faltando = missingOccurrences(
        planOccurrences(recurrence, horizon),
        numeros
      );
      if (faltando.length === 0) return 0;

      const { error: e2 } = await supabase.from("finance_entry").insert(
        faltando.map((o) => ({
          workspace_id: workspaceId,
          kind: recurrence.kind,
          description: recurrence.description,
          amount_cents: o.amountCents,
          // Nasce previsto: quem paga é que sabe quando pagou.
          status: "previsto" as const,
          due_date: o.dueDate,
          category: recurrence.category,
          // A classificação da recorrência desce para cada parcela gerada
          // (0081). Sem isto, lançamento recorrente ficaria fora de todo
          // recorte de rentabilidade — e recorrente é o que mais pesa.
          category_id: recurrence.category_id,
          sector_id: recurrence.sector_id,
          project_id: recurrence.project_id,
          client_id: recurrence.client_id,
          source_type: SOURCE,
          source_id: recurrence.id,
          installment_number: o.number,
        }))
      );
      if (e2) throw e2;
      return faltando.length;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: entriesKey(workspaceId) }),
  });
}

/**
 * Editar a regra. `applyToFuture` reescreve as ocorrências ainda NÃO
 * confirmadas e ainda não vencidas — é o "esta e as futuras" do §8.9.
 *
 * Confirmada nunca é tocada: já aconteceu, e reescrever o passado é como se
 * perde a confiança num sistema financeiro.
 */
export function useUpdateRecurrence(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
      applyToFuture,
      fromDate,
    }: {
      id: string;
      patch: Partial<NewRecurrence>;
      applyToFuture: boolean;
      /** A partir de quando "futuro" começa. Normalmente hoje. */
      fromDate: string;
    }) => {
      const { error } = await supabase
        .from("finance_recurrence")
        .update({
          ...(patch.description !== undefined && {
            description: patch.description,
          }),
          ...(patch.amountCents !== undefined && {
            amount_cents: patch.amountCents,
          }),
          ...(patch.frequency !== undefined && { frequency: patch.frequency }),
          ...(patch.endsOn !== undefined && { ends_on: patch.endsOn }),
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.clientId !== undefined && { client_id: patch.clientId }),
        })
        .eq("id", id);
      if (error) throw error;

      if (!applyToFuture) return;

      const { error: e2 } = await supabase
        .from("finance_entry")
        .update({
          ...(patch.description !== undefined && {
            description: patch.description,
          }),
          ...(patch.amountCents !== undefined && {
            amount_cents: patch.amountCents,
          }),
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.clientId !== undefined && { client_id: patch.clientId }),
        })
        .eq("source_type", SOURCE)
        .eq("source_id", id)
        .eq("status", "previsto")
        .gte("due_date", fromDate);
      if (e2) throw e2;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: recurrencesKey(workspaceId) });
      qc.invalidateQueries({ queryKey: entriesKey(workspaceId) });
    },
  });
}

/** Ligar/desligar sem apagar o que já foi gerado. */
export function useToggleRecurrence(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("finance_recurrence")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: recurrencesKey(workspaceId) }),
  });
}

/**
 * Apagar a regra. As ocorrências JÁ GERADAS ficam — o dinheiro daqueles
 * meses aconteceu. Quem quiser limpar previsão apaga lançamento a
 * lançamento, conscientemente.
 */
export function useDeleteRecurrence(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_recurrence")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: recurrencesKey(workspaceId) }),
  });
}
