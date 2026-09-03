"use client";

import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatCentsBRL } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { BillingPlan } from "@/types/database";

/**
 * Planos publicados, para quem está testando escolher.
 *
 * A leitura vem direto do banco: `billing_plan` tem policy de select para
 * quem está logado (0050), justamente para esta tela. A escrita não — vai
 * pela rota, que confere se quem pede é dono e se o plano é público.
 */
function usePublicPlans() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["publicPlans"],
    queryFn: async (): Promise<BillingPlan[]> => {
      const { data, error } = await supabase
        .from("billing_plan")
        .select("*")
        .eq("is_public", true)
        .eq("active", true)
        .order("price_cents", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function PlanChooser() {
  const workspace = useWorkspace();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: plans = [], isPending } = usePublicPlans();

  const escolher = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/workspace/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, planId }),
      });
      const corpo = (await res.json()) as { plan?: string; message?: string };
      // A mensagem do servidor é mais específica que qualquer texto genérico
      // daqui — é ela que explica, por exemplo, por que um acesso vitalício
      // não troca de plano sozinho.
      if (!res.ok) throw new Error(corpo.message ?? "falha");
      return corpo as { plan: string };
    },
    onSuccess: (data) => {
      toast.show({ message: `Plano ${data.plan} escolhido` });
      void qc.invalidateQueries();
      // O plano vive no workspace, que o layout do servidor carrega.
      router.refresh();
    },
    onError: (e) =>
      toast.show({
        message:
          e instanceof Error && e.message !== "falha"
            ? e.message
            : "Não foi possível escolher o plano",
      }),
  });

  if (isPending) return <p className="text-fg-secondary">Carregando…</p>;

  if (plans.length === 0) {
    return (
      <p className="text-fg-secondary">
        Nenhum plano publicado ainda. Fale com quem administra a plataforma.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-secondary text-[length:var(--text-small-size)]">
        Escolher agora não cobra nada e não muda o que você já pode fazer — é o
        registro de qual plano você quer quando a cobrança entrar.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const atual = workspace.plan_id === p.id;
          return (
            <div
              key={p.id}
              className={`bg-card flex flex-col gap-3 rounded-md border p-4 shadow-[var(--shadow-card)] ${
                atual ? "border-[var(--brand-600)]" : "border-line"
              }`}
            >
              <div className="flex items-start gap-2">
                <h2 className="text-fg flex-1 text-[length:var(--text-h3-size)] font-semibold">
                  {p.name}
                </h2>
                {atual ? (
                  <IconCheck
                    size={18}
                    stroke={2}
                    aria-label="Plano atual"
                    className="text-fg-link shrink-0"
                  />
                ) : null}
              </div>

              <p className="tnum text-fg text-[length:var(--text-h3-size)] font-semibold">
                {p.price_cents === 0 ? "Grátis" : formatCentsBRL(p.price_cents)}
                {p.price_cents > 0 ? (
                  <span className="text-fg-muted text-[length:var(--text-small-size)] font-normal">
                    {" "}
                    por mês
                  </span>
                ) : null}
              </p>

              <p className="text-fg-secondary text-[length:var(--text-small-size)]">
                Até {p.max_users} {p.max_users === 1 ? "pessoa" : "pessoas"}
              </p>
              {p.notes ? (
                <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                  {p.notes}
                </p>
              ) : null}

              <Button
                variant={atual ? "secondary" : "primary"}
                size="sm"
                className="mt-auto"
                disabled={atual}
                isLoading={escolher.isPending}
                onClick={() => escolher.mutate(p.id)}
              >
                {atual ? "Plano escolhido" : "Escolher"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
