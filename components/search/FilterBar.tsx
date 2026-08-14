"use client";

import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { DropdownMenu, Popover } from "radix-ui";

import { TextInput } from "@/components/ui/TextInput";
import { useSectors } from "@/lib/queries/useSectors";
import { useAllTags } from "@/lib/queries/useTags";
import type { SearchFilters } from "@/lib/search/filters";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const PRIORITIES = [
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Normal" },
  { value: "baixa", label: "Baixa" },
  { value: "sem_prioridade", label: "Sem prioridade" },
];

const STATUS = [
  { value: null, label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "atrasada", label: "Atrasadas" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
];

const menuContent =
  "z-50 min-w-48 overflow-hidden rounded-md tf-glass-strong p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]";
const menuItem =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken";

function TriggerButton({
  children,
  count,
  active,
}: {
  children: ReactNode;
  count?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] ${
        active
          ? "border-line-strong bg-sunken text-fg"
          : "border-line bg-card text-fg-secondary hover:bg-sunken"
      }`}
    >
      {children}
      {count ? (
        <span className="tnum bg-fill text-fg rounded-full px-1.5 text-[length:var(--text-caption-size)]">
          {count}
        </span>
      ) : null}
      <IconChevronDown size={14} stroke={1.5} className="text-fg-muted" />
    </button>
  );
}

function MultiMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <TriggerButton count={selected.length} active={selected.length > 0}>
          {label}
        </TriggerButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className={menuContent}
        >
          {options.length === 0 ? (
            <div className="text-fg-muted px-2 py-1.5 text-[length:var(--text-small-size)]">
              Nada aqui ainda
            </div>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <DropdownMenu.CheckboxItem
                  key={opt.value}
                  checked={checked}
                  onCheckedChange={() => onToggle(opt.value)}
                  onSelect={(e) => e.preventDefault()}
                  className={menuItem}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {checked ? <IconCheck size={14} stroke={2} /> : null}
                  </span>
                  {opt.label}
                </DropdownMenu.CheckboxItem>
              );
            })
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function FilterBar({
  filters,
  onToggle,
  onStatus,
  onDueRange,
  onService,
}: {
  filters: SearchFilters;
  onToggle: (key: "sectors" | "tags" | "priorities", value: string) => void;
  onStatus: (status: string | null) => void;
  onDueRange: (from: string | null, to: string | null) => void;
  onService: (service: string) => void;
}) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: tags = [] } = useAllTags(workspace.id);

  const statusLabel =
    STATUS.find((s) => s.value === filters.status)?.label ?? "Todas";
  const dueActive = !!filters.dueFrom || !!filters.dueTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiMenu
        label="Setor"
        options={sectors.map((s) => ({ value: s.id, label: s.name }))}
        selected={filters.sectors}
        onToggle={(v) => onToggle("sectors", v)}
      />
      <MultiMenu
        label="Tag"
        options={tags.map((t) => ({ value: t.id, label: t.name }))}
        selected={filters.tags}
        onToggle={(v) => onToggle("tags", v)}
      />
      <MultiMenu
        label="Prioridade"
        options={PRIORITIES}
        selected={filters.priorities}
        onToggle={(v) => onToggle("priorities", v)}
      />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <TriggerButton active={!!filters.status}>
            {`Status: ${statusLabel}`}
          </TriggerButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className={menuContent}
          >
            {STATUS.map((s) => (
              <DropdownMenu.Item
                key={s.label}
                onSelect={() => onStatus(s.value)}
                className={menuItem}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {filters.status === s.value ? (
                    <IconCheck size={14} stroke={2} />
                  ) : null}
                </span>
                {s.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Popover.Root>
        <Popover.Trigger asChild>
          <TriggerButton active={dueActive}>Prazo</TriggerButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="tf-glass-strong z-50 flex w-64 flex-col gap-3 rounded-md p-3 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
          >
            <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
              De
              <TextInput
                type="date"
                value={filters.dueFrom ?? ""}
                onChange={(e) => onDueRange(e.target.value, filters.dueTo)}
                aria-label="Prazo de"
              />
            </label>
            <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
              Até
              <TextInput
                type="date"
                value={filters.dueTo ?? ""}
                onChange={(e) => onDueRange(filters.dueFrom, e.target.value)}
                aria-label="Prazo até"
              />
            </label>
            {dueActive ? (
              <button
                type="button"
                onClick={() => onDueRange(null, null)}
                className="text-fg-link inline-flex items-center gap-1 self-start text-[length:var(--text-caption-size)]"
              >
                <IconX size={12} stroke={1.5} />
                Limpar prazo
              </button>
            ) : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root>
        <Popover.Trigger asChild>
          <TriggerButton active={!!filters.service}>
            {filters.service ? `Tipo: ${filters.service}` : "Tipo de demanda"}
          </TriggerButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="tf-glass-strong z-50 flex w-56 flex-col gap-2 rounded-md p-3 data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
          >
            <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
              Tipo de demanda
              <TextInput
                value={filters.service}
                onChange={(e) => onService(e.target.value)}
                placeholder="Ex.: Design, Suporte…"
                aria-label="Tipo de demanda"
              />
            </label>
            {filters.service ? (
              <button
                type="button"
                onClick={() => onService("")}
                className="text-fg-link inline-flex items-center gap-1 self-start text-[length:var(--text-caption-size)]"
              >
                <IconX size={12} stroke={1.5} />
                Limpar
              </button>
            ) : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
