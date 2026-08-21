"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { localDayISO } from "@/lib/dates/day";
import { formatCentsBRL, parseCurrencyToCents } from "@/lib/finance/money";
import { useUpdateRecurrence } from "@/lib/queries/useFinanceRecurrence";
import type { FinanceRecurrence } from "@/types/database";

/**
 * Editar a regra e escolher o alcance (spec §8.9).
 *
 * "Apenas esta ocorrência" não está aqui de propósito: uma ocorrência é um
 * lançamento comum e já se edita na lista do mês. Trazê-la para cá seria um
 * segundo caminho para a mesma coisa.
 *
 * O que nunca muda é ocorrência CONFIRMADA — já aconteceu. Reescrever o
 * passado é como se perde a confiança num sistema financeiro, e a regra
 * disso vive no hook, não aqui.
 */
export function RecurrenceEditor({
  workspaceId,
  rule,
  onDone,
}: {
  workspaceId: string;
  rule: FinanceRecurrence;
  onDone: () => void;
}) {
  const toast = useToast();
  const update = useUpdateRecurrence(workspaceId);

  const [description, setDescription] = useState(rule.description);
  const [valor, setValor] = useState(formatCentsBRL(rule.amount_cents));
  const [endsOn, setEndsOn] = useState(rule.ends_on ?? "");
  const [alcance, setAlcance] = useState<"regra" | "futuras" | "todas">(
    "futuras"
  );

  const cents = parseCurrencyToCents(valor);
  const podeSalvar = !!description.trim() && !!cents && cents > 0;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSalvar || update.isPending) return;

    update.mutate(
      {
        id: rule.id,
        patch: {
          description: description.trim(),
          amountCents: cents as number,
          endsOn: endsOn || null,
        },
        applyToFuture: alcance !== "regra",
        // "Todas as não realizadas" alcança até o que já venceu e continua
        // previsto; "daqui para frente" começa hoje.
        fromDate:
          alcance === "todas" ? rule.starts_on : localDayISO(new Date()),
      },
      {
        onSuccess: () => {
          toast.show({
            message:
              alcance === "regra"
                ? "Regra atualizada · lançamentos existentes mantidos"
                : "Regra e lançamentos previstos atualizados",
          });
          onDone();
        },
        onError: () => toast.show({ message: "Não foi possível salvar" }),
      }
    );
  }

  return (
    <form
      onSubmit={salvar}
      className="border-line bg-sunken flex flex-col gap-3 rounded-sm border p-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Descrição
          </span>
          <TextInput
            size="sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Valor
          </span>
          <CurrencyInput
            size="sm"
            value={valor}
            onChange={setValor}
            aria-label="Novo valor"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
            Até (opcional)
          </span>
          <TextInput
            size="sm"
            type="date"
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Aplicar a
        </legend>
        {(
          [
            ["futuras", "Esta e as próximas — previstas a partir de hoje"],
            ["todas", "Toda a série ainda não realizada"],
            ["regra", "Só a regra — não mexer no que já foi gerado"],
          ] as const
        ).map(([valorOpcao, rotulo]) => (
          <label
            key={valorOpcao}
            className="text-fg flex items-center gap-2 text-[length:var(--text-small-size)]"
          >
            <input
              type="radio"
              name={`alcance-${rule.id}`}
              value={valorOpcao}
              checked={alcance === valorOpcao}
              onChange={() => setAlcance(valorOpcao)}
              className="accent-[var(--brand-600)]"
            />
            {rotulo}
          </label>
        ))}
      </fieldset>

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Lançamentos já confirmados nunca mudam.
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={!podeSalvar}
          isLoading={update.isPending}
        >
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
