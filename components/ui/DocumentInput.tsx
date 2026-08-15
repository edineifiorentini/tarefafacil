"use client";

import { isValidDocument, maskDocument } from "@/lib/validation/document";

import { TextInput } from "./TextInput";

/**
 * Campo de CPF/CNPJ: formata enquanto digita e avisa quando o dígito
 * verificador não fecha. O erro é informativo, não bloqueia o salvamento —
 * o documento é opcional e às vezes o usuário só quer registrar o que tem.
 */
export function DocumentInput({
  value,
  onChange,
  type,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (masked: string) => void;
  type: "pf" | "pj";
  "aria-label": string;
}) {
  const invalid = !isValidDocument(value, type);
  const errorId = `${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-erro`;

  return (
    <div className="flex flex-col gap-1">
      <TextInput
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(maskDocument(e.target.value, type))}
        placeholder={type === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        error={invalid}
      />
      {invalid ? (
        <p
          id={errorId}
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          Confira os números: o dígito verificador não fecha
        </p>
      ) : null}
    </div>
  );
}
