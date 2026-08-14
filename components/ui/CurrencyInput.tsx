"use client";

import { maskCurrencyInput } from "@/lib/finance/money";

import { TextInput } from "./TextInput";

// Campo de valor em reais com máscara ao digitar: dígitos formam a parte
// inteira (separador de milhar automático), completada com ",00" — a
// vírgula edita os centavos. O valor controlado é sempre o texto
// mascarado (ex.: "1.500,00"); parseCurrencyToCents converte na borda.
export function CurrencyInput({
  value,
  onChange,
  size,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (masked: string) => void;
  size?: "sm" | "md";
  "aria-label": string;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
      >
        R$
      </span>
      <TextInput
        size={size}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(maskCurrencyInput(e.target.value))}
        placeholder="0,00"
        aria-label={ariaLabel}
        className="pl-9"
      />
    </div>
  );
}
