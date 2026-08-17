"use client";

import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Select as RxSelect } from "radix-ui";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  "aria-label"?: string;
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Selecione…",
  disabled,
  error = false,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <RxSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <RxSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        className={`bg-card text-fg data-[placeholder]:text-fg-muted inline-flex h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-sm border px-3 text-[length:var(--text-body-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-overdue" : "border-line hover:border-line-strong"
        }`}
      >
        {/* Rótulo longo ("Todos os responsáveis") corta com reticências em vez
            de quebrar o gatilho em duas linhas e empurrar a seta para fora. */}
        <span className="min-w-0 flex-1 truncate text-left">
          <RxSelect.Value placeholder={placeholder} />
        </span>
        <RxSelect.Icon className="shrink-0">
          <IconChevronDown size={18} stroke={1.5} className="text-fg-muted" />
        </RxSelect.Icon>
      </RxSelect.Trigger>
      <RxSelect.Portal>
        <RxSelect.Content
          position="popper"
          sideOffset={4}
          className="tf-glass-strong z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
        >
          <RxSelect.Viewport className="p-1">
            {options.map((option) => (
              <RxSelect.Item
                key={option.value}
                value={option.value}
                className="text-fg data-[highlighted]:bg-hover relative flex cursor-pointer items-center rounded-sm py-2 pr-3 pl-8 text-[length:var(--text-small-size)] outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60"
              >
                <RxSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <IconCheck size={16} stroke={2} />
                </RxSelect.ItemIndicator>
                <RxSelect.ItemText>{option.label}</RxSelect.ItemText>
              </RxSelect.Item>
            ))}
          </RxSelect.Viewport>
        </RxSelect.Content>
      </RxSelect.Portal>
    </RxSelect.Root>
  );
}
