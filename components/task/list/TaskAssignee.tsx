"use client";

import { IconUserPlus } from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { Avatar } from "@/components/ui/Avatar";

/**
 * Quem responde pela demanda — e, quando não há ninguém, um jeito de
 * resolver isso ali mesmo.
 *
 * **"Sem responsável" é escrito, não deixado em branco.** Espaço vazio numa
 * coluna é ambíguo: pode ser demanda sem dono ou avatar que não carregou. E
 * a demanda que ninguém pegou é justamente a que mais apodrece — foi por
 * isso que ela virou uma das visões rápidas.
 *
 * A atribuição rápida só aparece quando há quem atribuir E quem receba. Um
 * menu que abre vazio é pior que menu nenhum.
 */
export function TaskAssignee({
  nome,
  avatarUrl,
  membros,
  onAtribuir,
}: {
  nome: string | null;
  avatarUrl?: string | null;
  /** Quem pode receber. Vazio esconde a ação. */
  membros: { id: string; nome: string }[];
  onAtribuir?: (userId: string) => void;
}) {
  if (nome) {
    return (
      <span className="flex min-w-0 items-center gap-2" title={nome}>
        <Avatar name={nome} src={avatarUrl ?? undefined} size="sm" />
        <span className="text-fg-secondary truncate text-[length:var(--text-small-size)]">
          {nome}
        </span>
      </span>
    );
  }

  if (!onAtribuir || membros.length === 0) {
    return (
      <span className="text-fg-muted text-[length:var(--text-caption-size)] italic">
        Sem responsável
      </span>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Atribuir responsável"
          className="text-fg-muted hover:text-fg hover:bg-hover -mx-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[length:var(--text-caption-size)] italic transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <IconUserPlus size={15} stroke={1.75} aria-hidden />
          Sem responsável
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="tf-glass-strong border-line z-50 max-h-64 min-w-48 overflow-y-auto rounded-md border p-1 shadow-[var(--shadow-popover)]"
        >
          <DropdownMenu.Label className="text-fg-muted px-2 py-1.5 text-[length:var(--text-caption-size)]">
            Atribuir a
          </DropdownMenu.Label>
          {membros.map((m) => (
            <DropdownMenu.Item
              key={m.id}
              onSelect={() => onAtribuir(m.id)}
              className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
            >
              <Avatar name={m.nome} size="sm" />
              <span className="truncate">{m.nome}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
