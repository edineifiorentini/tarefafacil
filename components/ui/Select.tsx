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
        className={`inline-flex h-10 w-full items-center justify-between gap-2 rounded-sm border bg-card px-3 text-[length:var(--text-body-size)] text-fg transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:text-fg-muted ${
          error ? "border-overdue" : "border-line hover:border-line-strong"
        }`}
      >
        <RxSelect.Value placeholder={placeholder} />
        <RxSelect.Icon>
          <IconChevronDown size={18} stroke={1.5} className="text-fg-muted" />
        </RxSelect.Icon>
      </RxSelect.Trigger>
      <RxSelect.Portal>
        <RxSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-line bg-card shadow-[var(--shadow-panel)]"
        >
          <RxSelect.Viewport className="p-1">
            {options.map((option) => (
              <RxSelect.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-[length:var(--text-small-size)] text-fg outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-sunken data-[disabled]:opacity-60"
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
