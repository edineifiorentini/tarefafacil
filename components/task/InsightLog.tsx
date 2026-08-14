"use client";

import { differenceInMinutes, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateInsight,
  useInsights,
  useUpdateInsight,
} from "@/lib/queries/useInsights";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Insight } from "@/types/database";

function InsightEntry({
  insight,
  onSave,
}: {
  insight: Insight;
  onSave: (body: string) => void;
}) {
  const editable =
    differenceInMinutes(new Date(), parseISO(insight.created_at)) < 5;
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(insight.body);

  return (
    <div className="border-line bg-card rounded-md border p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="tnum text-fg-muted text-[length:var(--text-caption-size)]">
          {format(parseISO(insight.created_at), "d MMM, HH:mm", {
            locale: ptBR,
          })}
        </span>
        {editable && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-fg-link text-[length:var(--text-caption-size)]"
          >
            Editar
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            autogrow
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Editar insight"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setBody(insight.body);
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const trimmed = body.trim();
                if (trimmed) onSave(trimmed);
                setEditing(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-fg text-[length:var(--text-small-size)] whitespace-pre-wrap">
          {insight.body}
        </p>
      )}
    </div>
  );
}

export function InsightLog({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: insights = [] } = useInsights(workspace.id, taskId);
  const create = useCreateInsight(workspace.id, taskId);
  const update = useUpdateInsight(workspace.id, taskId);
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    create.mutate(trimmed);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      {insights.map((insight) => (
        <InsightEntry
          key={insight.id}
          insight={insight}
          onSave={(body) => update.mutate({ id: insight.id, body })}
        />
      ))}
      <div className="flex flex-col gap-2">
        <Textarea
          autogrow
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Registrar um insight…"
          aria-label="Novo insight"
        />
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={add}>
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
