"use client";

import { useState } from "react";

import {
  IconBan,
  IconCalendarEvent,
  IconDotsVertical,
  IconExternalLink,
  IconRotate,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { Checkbox } from "@/components/ui/Checkbox";
import { descreverPrazo } from "@/lib/task/deadline";
import type { Sector, Task } from "@/types/database";

import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog";
import { CELULA, GRADE } from "./grade";
import { TaskAssignee } from "./TaskAssignee";
import { TaskDeadline } from "./TaskDeadline";
import { TaskStatusChip } from "./TaskStatusChip";

/**
 * Uma demanda na Lista.
 *
 * **Conclusão e seleção são controles diferentes, e essa é a correção
 * central desta tela.** Antes, a caixa de seleção nascia ao lado da bolinha
 * de concluir e as duas disputavam o mesmo canto — quem só queria marcar
 * como feita acabava selecionando, e vice-versa. Agora a seleção só existe
 * quando alguém pede ("Selecionar"), e quando existe ela OCUPA o lugar da
 * bolinha em vez de somar mais um alvo. Um controle por linha, sempre.
 *
 * A linha inteira é alvo de clique para abrir o detalhe — menos os
 * controles, que param a propagação. É um `<div>` com `onClick` e não um
 * `<button>` envolvendo tudo porque dentro dela há outros botões, e botão
 * dentro de botão é HTML inválido: o navegador desmonta a árvore e o clique
 * passa a cair no lugar errado. O foco por teclado chega pelo título, que é
 * um botão de verdade.
 */
export function TaskListRow({
  task,
  sector,
  coluna,
  responsavel,
  secundaria,
  membros,
  modoSelecao,
  selecionada,
  denso,
  onSelectChange,
  onToggle,
  onToggleCancel,
  onDelete,
  onOpen,
  onAtribuir,
  onEditarPrazo,
}: {
  task: Task;
  sector?: Sector;
  /** Nome da coluna do quadro em que a demanda está. */
  coluna?: string | null;
  responsavel: { nome: string; avatarUrl: string | null } | null;
  /** Cliente ou projeto — uma linha secundária só, quando existir. */
  secundaria?: string | null;
  membros: { id: string; nome: string }[];
  modoSelecao: boolean;
  selecionada: boolean;
  denso: boolean;
  onSelectChange: (on: boolean) => void;
  onToggle: (completed: boolean) => void;
  onToggleCancel: (cancel: boolean) => void;
  onDelete: () => void;
  onOpen: () => void;
  onAtribuir?: (userId: string) => void;
  onEditarPrazo: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  const concluida = task.completed_at !== null;
  const cancelada = task.cancelled_at !== null;
  const encerrada = concluida || cancelada;
  const prazo = descreverPrazo(task);

  return (
    <div
      onClick={onOpen}
      className={`${GRADE} group border-line hover:bg-hover relative cursor-pointer border-b px-4 transition-colors [transition-duration:var(--dur-fast)] last:border-b-0 ${
        denso ? "min-h-[3.25rem] py-2" : "min-h-[4.25rem] py-3"
      } ${selecionada ? "bg-sunken" : ""}`}
    >
      {/* Controle. Um só por linha: em modo de seleção, a caixa TOMA o lugar
          da bolinha em vez de aparecer ao lado dela. */}
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {modoSelecao ? (
          <Checkbox
            checked={selecionada}
            onCheckedChange={(c) => onSelectChange(c === true)}
            aria-label={`${selecionada ? "Remover da seleção" : "Selecionar"}: ${task.title}`}
          />
        ) : (
          <Checkbox
            variant="round"
            checked={concluida}
            disabled={cancelada}
            onCheckedChange={(c) => onToggle(c === true)}
            aria-label={
              concluida
                ? `Reabrir ${task.title}`
                : `Marcar ${task.title} como concluída`
            }
          />
        )}
      </div>

      {/* Demanda */}
      <div className="flex min-w-0 flex-col">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={`truncate rounded-xs text-left text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
            // Concluída perde peso, mas continua legível. O risco no texto
            // some: com o chip "Concluída" ao lado e o controle marcado, ele
            // era o terceiro sinal da mesma coisa — e o que mais atrapalha
            // quem precisa reler o título.
            encerrada ? "text-fg-secondary" : "text-fg font-medium"
          }`}
        >
          {task.title}
        </button>
        {secundaria ? (
          <span className="text-fg-muted truncate text-[length:var(--text-caption-size)]">
            {secundaria}
          </span>
        ) : null}
      </div>

      {/* Status */}
      <div className={CELULA.status}>
        <TaskStatusChip
          coluna={coluna}
          concluida={concluida}
          cancelada={cancelada}
        />
      </div>

      {/* Setor — bolinha E nome. A cor sozinha não identifica nada para
          quem não a distingue, e são doze setores nesta empresa. */}
      <div className={`${CELULA.setor} items-center gap-2`}>
        {sector ? (
          <>
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: sector.color }}
            />
            <span className="text-fg-secondary truncate text-[length:var(--text-small-size)]">
              {sector.name}
            </span>
          </>
        ) : (
          <span className="text-fg-muted text-[length:var(--text-caption-size)]">
            —
          </span>
        )}
      </div>

      {/* Responsável */}
      <div className={CELULA.responsavel} onClick={(e) => e.stopPropagation()}>
        <TaskAssignee
          nome={responsavel?.nome ?? null}
          avatarUrl={responsavel?.avatarUrl}
          membros={membros}
          onAtribuir={encerrada ? undefined : onAtribuir}
        />
      </div>

      {/* Prazo, e por cima dele as ações rápidas no hover. Elas ocupam o
          mesmo espaço de propósito: somar uma coluna só para dois botões que
          quase sempre estão invisíveis desperdiçaria a largura que o título
          precisa. */}
      <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
        <span className="transition-opacity [transition-duration:var(--dur-fast)] group-focus-within:opacity-0 group-hover:opacity-0">
          <TaskDeadline prazo={prazo} />
        </span>

        <span className="absolute inset-y-0 right-0 flex items-center gap-1 opacity-0 transition-opacity [transition-duration:var(--dur-fast)] group-focus-within:opacity-100 group-hover:opacity-100">
          <AcaoRapida
            icone={IconExternalLink}
            rotulo={`Abrir ${task.title}`}
            texto="Abrir demanda"
            onClick={onOpen}
          />
          {encerrada ? null : (
            <AcaoRapida
              icone={IconCalendarEvent}
              rotulo={`Editar prazo de ${task.title}`}
              texto="Editar prazo"
              onClick={onEditarPrazo}
            />
          )}
        </span>
      </div>

      {/* Ações */}
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Ações de ${task.title}`}
              className="text-fg-muted hover:text-fg hover:bg-hover inline-flex h-8 w-8 items-center justify-center rounded-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              <IconDotsVertical size={16} stroke={1.5} aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="tf-glass-strong border-line z-50 min-w-48 rounded-md border p-1 shadow-[var(--shadow-popover)]"
            >
              <ItemDoMenu
                icone={IconExternalLink}
                onSelect={onOpen}
                texto="Abrir demanda"
              />
              {encerrada ? null : (
                <ItemDoMenu
                  icone={IconCalendarEvent}
                  onSelect={onEditarPrazo}
                  texto="Editar prazo"
                />
              )}
              <ItemDoMenu
                icone={cancelada ? IconRotate : IconBan}
                onSelect={() => onToggleCancel(!cancelada)}
                texto={cancelada ? "Reabrir demanda" : "Cancelar demanda"}
              />
              <DropdownMenu.Separator className="bg-line my-1 h-px" />
              <DropdownMenu.Item
                // O menu devolve o foco ao fechar; sem `preventDefault` o
                // diálogo abre e perde o foco no mesmo instante.
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmando(true);
                }}
                className="data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                style={{ color: "var(--status-overdue-fg)" }}
              >
                <IconTrash size={16} stroke={1.5} aria-hidden />
                Excluir
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <ConfirmDeleteDialog
        open={confirmando}
        title={task.title}
        onOpenChange={setConfirmando}
        onConfirm={onDelete}
      />
    </div>
  );
}

function AcaoRapida({
  icone: Icone,
  rotulo,
  texto,
  onClick,
}: {
  icone: typeof IconExternalLink;
  rotulo: string;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className="border-line bg-card text-fg-secondary hover:text-fg hover:border-line-strong inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-[length:var(--text-caption-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      <Icone size={14} stroke={1.75} aria-hidden />
      <span className="hidden @4xl:inline">{texto}</span>
    </button>
  );
}

function ItemDoMenu({
  icone: Icone,
  texto,
  onSelect,
}: {
  icone: typeof IconExternalLink;
  texto: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
    >
      <Icone size={16} stroke={1.5} aria-hidden />
      {texto}
    </DropdownMenu.Item>
  );
}
