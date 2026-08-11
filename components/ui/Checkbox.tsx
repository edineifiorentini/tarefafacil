"use client";

import { IconCheck, IconMinus } from "@tabler/icons-react";
import { Checkbox as RxCheckbox } from "radix-ui";

type Variant = "default" | "round";

export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  disabled?: boolean;
  variant?: Variant;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

// Radix Checkbox estilizado. Variante "round" para subtarefas (design 8.1).
export function Checkbox({ variant = "default", className, ...props }: CheckboxProps) {
  const radius = variant === "round" ? "rounded-full" : "rounded-sm";
  return (
    <RxCheckbox.Root
      {...props}
      className={`group inline-flex h-5 w-5 items-center justify-center border border-line-strong bg-card text-[var(--button-primary-fg)] transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--button-primary-bg)] data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-[var(--button-primary-bg)] ${radius} ${className ?? ""}`}
    >
      <RxCheckbox.Indicator forceMount className="flex">
        <IconCheck
          size={14}
          stroke={2.5}
          className="hidden group-data-[state=checked]:block group-data-[state=checked]:[animation:tf-check-pop_var(--dur-fast)_var(--ease-out)]"
        />
        <IconMinus
          size={14}
          stroke={2.5}
          className="hidden group-data-[state=indeterminate]:block"
        />
      </RxCheckbox.Indicator>
    </RxCheckbox.Root>
  );
}
