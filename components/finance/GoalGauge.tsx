"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  centsToMaskedInput,
  formatCentsBRL,
  parseCurrencyToCents,
} from "@/lib/finance/money";
import {
  useFinanceGoal,
  useSetFinanceGoal,
} from "@/lib/queries/useFinanceGoal";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const R = 70;
const CX = 90;
const CY = 84;

function arcEndpoint(progress: number) {
  const theta =
    (180 - Math.min(Math.max(progress, 0), 1) * 180) * (Math.PI / 180);
  return { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) };
}

// Medidor semicircular (spec 8.5). Recebe `received` (o "Recebido" do mês,
// já calculado por computeFinanceStats — mesma fonte usada nos cartões, sem
// fórmula duplicada). A barra satura em 180° acima de 100%, mas o número
// mostra o percentual real (ex.: "134%") sem quebrar o componente.
export function GoalGauge({
  month,
  received,
}: {
  month: string;
  received: number;
}) {
  const workspace = useWorkspace();
  const { data: goal } = useFinanceGoal(workspace.id, month);
  const setGoal = useSetFinanceGoal(workspace.id, month);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const target = goal?.target_cents ?? 0;
  const progress = target > 0 ? received / target : 0;
  const percent = target > 0 ? Math.round(progress * 100) : 0;
  const missing = Math.max(target - received, 0);
  const end = arcEndpoint(progress);
  const color =
    percent >= 100
      ? "var(--brand-600)"
      : percent >= 50
        ? "var(--tone-amber)"
        : "var(--color-overdue)";

  function startEdit() {
    setDraft(target > 0 ? centsToMaskedInput(target) : "");
    setEditing(true);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCurrencyToCents(draft);
    if (!cents) return;
    setGoal.mutate(cents, { onSuccess: () => setEditing(false) });
  }

  return (
    <div className="border-line bg-card flex flex-col items-center gap-2 rounded-md border p-4">
      <h3 className="text-fg-secondary self-start text-[length:var(--text-small-size)] font-medium">
        Meta do mês
      </h3>

      <svg viewBox="0 0 180 100" className="w-full max-w-[220px]">
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        {target > 0 ? (
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
          />
        ) : null}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          className="fill-fg"
          style={{ fontSize: 22, fontWeight: 600 }}
        >
          {target > 0 ? `${percent}%` : "—"}
        </text>
      </svg>

      {target > 0 ? (
        <div className="flex flex-col items-center gap-0.5 text-[length:var(--text-small-size)]">
          <p className="text-fg">
            {formatCentsBRL(received)} de {formatCentsBRL(target)}
          </p>
          <p className="text-fg-muted">
            {missing > 0
              ? `Faltam ${formatCentsBRL(missing)}`
              : "Meta atingida"}
          </p>
        </div>
      ) : (
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Nenhuma meta definida para este mês
        </p>
      )}

      {editing ? (
        <form onSubmit={submit} className="flex items-center gap-2">
          <div className="w-32">
            <CurrencyInput
              value={draft}
              onChange={setDraft}
              aria-label="Meta do mês"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            isLoading={setGoal.isPending}
          >
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <Button size="sm" variant="ghost" onClick={startEdit}>
          {target > 0 ? "Alterar meta" : "Definir meta"}
        </Button>
      )}
    </div>
  );
}
