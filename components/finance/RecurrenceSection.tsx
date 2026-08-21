"use client";

import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { formatCentsBRL, parseCurrencyToCents } from "@/lib/finance/money";
import { FREQUENCY_LABEL, ruleSummary } from "@/lib/finance/recurrence";
import {
  useCreateRecurrence,
  useDeleteRecurrence,
  useFinanceRecurrences,
  useGenerateOccurrences,
  useToggleRecurrence,
} from "@/lib/queries/useFinanceRecurrence";
import type { FinanceRecurrence } from "@/types/database";

import { RecurrenceEditor } from "./RecurrenceEditor";

const FREQ_OPTIONS = Object.entries(FREQUENCY_LABEL).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Lançamentos que se repetem (spec §8.9).
 *
 * A regra fica aqui; as ocorrências viram lançamentos normais na lista do
 * mês, com situação e nota fiscal próprias. Gerar é uma ação explícita e
 * repetível — apertar duas vezes não duplica nada.
 */
export function RecurrenceSection({ workspaceId }: { workspaceId: string }) {
  const toast = useToast();
  const { data: rules = [] } = useFinanceRecurrences(workspaceId);
  const create = useCreateRecurrence(workspaceId);
  const generate = useGenerateOccurrences(workspaceId);
  const toggle = useToggleRecurrence(workspaceId);
  const remove = useDeleteRecurrence(workspaceId);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [kind, setKind] = useState<"entrada" | "saida">("saida");
  const [description, setDescription] = useState("");
  const [valor, setValor] = useState("");
  const [frequency, setFrequency] = useState("mensal");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const cents = parseCurrencyToCents(valor);
  const podeCriar = !!description.trim() && !!cents && cents > 0 && !!startsOn;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeCriar || create.isPending) return;
    create.mutate(
      {
        kind,
        description: description.trim(),
        amountCents: cents as number,
        frequency: frequency as "mensal" | "trimestral" | "anual",
        startsOn,
        endsOn: endsOn || null,
        category: null,
        clientId: null,
      },
      {
        onSuccess: (regra) => {
          setDescription("");
          setValor("");
          setStartsOn("");
          setEndsOn("");
          setAberto(false);
          // Gera já: uma regra sem nenhum lançamento não mostra serventia.
          generate.mutate(
            { recurrence: regra },
            {
              onSuccess: (n) =>
                toast.show({
                  message: `Recorrência criada · ${n} lançamentos previstos`,
                }),
            }
          );
        },
        onError: () =>
          toast.show({ message: "Não foi possível criar a recorrência" }),
      }
    );
  }

  function gerar(regra: FinanceRecurrence) {
    generate.mutate(
      { recurrence: regra },
      {
        onSuccess: (n) =>
          toast.show({
            message:
              n === 0
                ? "Nada a gerar — as previsões já estão em dia"
                : `${n} lançamentos previstos gerados`,
          }),
        onError: () => toast.show({ message: "Não foi possível gerar" }),
      }
    );
  }

  return (
    <section className="border-line bg-card flex flex-col gap-3 rounded-md border p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <IconRepeat size={16} stroke={1.75} aria-hidden className="shrink-0" />
        <h2 className="text-fg flex-1 text-[length:var(--text-h3-size)] font-semibold">
          Lançamentos recorrentes
        </h2>
        <Button
          size="sm"
          variant={aberto ? "ghost" : "primary"}
          leadingIcon={aberto ? undefined : IconPlus}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? "Cancelar" : "Nova recorrência"}
        </Button>
      </div>

      {aberto ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Descrição
              </span>
              <TextInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Aluguel da sede"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Valor
              </span>
              <CurrencyInput
                value={valor}
                onChange={setValor}
                aria-label="Valor da recorrência"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Tipo
              </span>
              <Select
                options={[
                  { value: "saida", label: "Saída" },
                  { value: "entrada", label: "Entrada" },
                ]}
                value={kind}
                onValueChange={(v) => setKind(v as "entrada" | "saida")}
                aria-label="Tipo"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Repete
              </span>
              <Select
                options={FREQ_OPTIONS}
                value={frequency}
                onValueChange={setFrequency}
                aria-label="Periodicidade"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Primeiro vencimento
              </span>
              <TextInput
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
                Até (opcional)
              </span>
              <TextInput
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </label>
          </div>

          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Sem data final, gera um ano de previsão por vez. Gerar de novo
            depois completa o que faltar, sem duplicar.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="w-fit"
            disabled={!podeCriar}
            isLoading={create.isPending}
          >
            Criar recorrência
          </Button>
        </form>
      ) : null}

      {rules.length === 0 ? (
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Nenhuma recorrência. Use para o que se repete todo mês — aluguel,
          assinatura, mensalidade de cliente.
        </p>
      ) : (
        <ul className="divide-line divide-y">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[length:var(--text-small-size)] font-medium ${
                      r.active ? "text-fg" : "text-fg-muted line-through"
                    }`}
                  >
                    {r.description}
                    <span
                      className="ml-2 rounded-xs px-1.5 text-[length:var(--text-caption-size)] font-normal"
                      style={{
                        color:
                          r.kind === "entrada"
                            ? "var(--color-positive)"
                            : "var(--color-fg-secondary)",
                        background: "var(--color-sunken)",
                      }}
                    >
                      {r.kind === "entrada" ? "entrada" : "saída"}
                    </span>
                  </p>
                  <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                    {ruleSummary(r, formatCentsBRL)}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditando(editando === r.id ? null : r.id)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => gerar(r)}
                  isLoading={generate.isPending}
                  disabled={!r.active}
                >
                  Gerar previsões
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={
                    r.active ? "Pausar recorrência" : "Retomar recorrência"
                  }
                  onClick={() => toggle.mutate({ id: r.id, active: !r.active })}
                >
                  {r.active ? (
                    <IconPlayerPause size={16} stroke={1.75} />
                  ) : (
                    <IconPlayerPlay size={16} stroke={1.75} />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Excluir recorrência ${r.description}`}
                  onClick={() => {
                    // Os lançamentos já gerados ficam — o dinheiro daqueles
                    // meses aconteceu. Vale dizer isso antes de apagar.
                    if (
                      window.confirm(
                        "Excluir a regra? Os lançamentos já gerados continuam na lista."
                      )
                    ) {
                      remove.mutate(r.id);
                    }
                  }}
                >
                  <IconTrash size={16} stroke={1.75} />
                </Button>
              </div>

              {editando === r.id ? (
                <RecurrenceEditor
                  workspaceId={workspaceId}
                  rule={r}
                  onDone={() => setEditando(null)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
