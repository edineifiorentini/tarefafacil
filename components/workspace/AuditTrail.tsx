"use client";

import {
  IconCoin,
  IconFileText,
  IconHistory,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUserShield,
} from "@tabler/icons-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { EmptyState } from "@/components/ui/EmptyState";
import { useAuditLog } from "@/lib/queries/useAuditLog";
import type { AuditAction, AuditLog } from "@/types/database";

const ACTION_ICON: Record<AuditAction, typeof IconPlus> = {
  criou: IconPlus,
  alterou: IconPencil,
  excluiu: IconTrash,
};

const ACTION_TONE: Record<AuditAction, string> = {
  criou: "var(--chart-1)",
  alterou: "var(--tone-amber)",
  excluiu: "var(--color-overdue)",
};

const ENTITY_LABEL: Record<string, string> = {
  workspace_member: "Acesso",
  finance_entry: "Financeiro",
  contract: "Contrato",
  task: "Demanda",
  client: "Cliente",
  sector: "Setor",
  project: "Projeto",
};

const ENTITY_ICON: Record<string, typeof IconPlus> = {
  workspace_member: IconUserShield,
  finance_entry: IconCoin,
  contract: IconFileText,
};

function quando(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR });
}

/**
 * Trilha do workspace: dinheiro, contratos, permissões e exclusões (spec
 * §15). Distinta do histórico da demanda, que já existe em `task_activity`
 * e responde outra pergunta — esta é "quem mexeu no que é sensível".
 *
 * Só leitura, e nem isso o dono controla: a tabela não tem policy de update
 * nem de delete. Trilha que se apaga não serve para nada.
 */
export function AuditTrail({
  workspaceId,
  canRead,
}: {
  workspaceId: string;
  canRead: boolean;
}) {
  const { data: entries = [], isLoading } = useAuditLog(workspaceId, canRead);

  if (!canRead) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
        Auditoria
      </h2>
      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Movimentações de acesso, dinheiro, contratos e exclusões. O registro
        não pode ser editado nem apagado.
      </p>

      {isLoading ? (
        <p className="text-fg-secondary py-4 text-[length:var(--text-small-size)]">
          Carregando…
        </p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={IconHistory}
          title="Nada registrado ainda"
          description="Mudanças de papel, lançamentos, contratos e exclusões aparecem aqui"
        />
      ) : (
        <ul className="border-line bg-card divide-line divide-y overflow-hidden rounded-md border">
          {entries.map((e) => (
            <Linha key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Linha({ entry }: { entry: AuditLog }) {
  const Icon = ENTITY_ICON[entry.entity_type] ?? ACTION_ICON[entry.action];
  const tone = ACTION_TONE[entry.action];

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs"
        style={{
          color: tone,
          background: `color-mix(in srgb, ${tone} 12%, transparent)`,
        }}
      >
        <Icon size={14} stroke={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-fg text-[length:var(--text-small-size)] wrap-anywhere">
          {entry.summary}
        </p>
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          {ENTITY_LABEL[entry.entity_type] ?? entry.entity_type} ·{" "}
          <time dateTime={entry.created_at}>{quando(entry.created_at)}</time>
        </p>
      </div>
    </li>
  );
}
