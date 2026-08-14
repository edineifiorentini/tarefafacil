// Dinheiro sempre em centavos (inteiro) — nunca float. Formata/interpreta
// na borda (UI); o resto do módulo só manipula amount_cents.

export function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Aceita "1234,56", "1234.56" ou "1.234,56". Retorna null se não der pra
// interpretar como valor positivo.
export function parseCurrencyToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

// Máscara "ao digitar": os dígitos formam a parte inteira (reais, com
// separador de milhar), completada com ",00" de centavos automaticamente.
// Ao digitar uma vírgula, os dígitos seguintes (até 2) substituem os
// centavos — ex.: "1500" -> "1.500,00"; "1500,5" -> "1.500,50".
export function maskCurrencyInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  if (!cleaned) return "";

  const commaIndex = cleaned.indexOf(",");
  const intDigits = commaIndex === -1 ? cleaned : cleaned.slice(0, commaIndex);
  const intPart = intDigits.replace(/^0+(?=\d)/, "") || "0";
  const intFormatted = Number(intPart).toLocaleString("pt-BR");

  let cents = "00";
  if (commaIndex !== -1) {
    const centsDigits = cleaned.slice(commaIndex + 1).replace(/,/g, "").slice(0, 2);
    cents = (centsDigits + "00").slice(0, 2);
  }
  return `${intFormatted},${cents}`;
}

// Constrói o texto mascarado a partir de centavos já guardados (ex.: ao
// abrir um lançamento existente pra editar).
export function centsToMaskedInput(cents: number): string {
  const reais = Math.floor(cents / 100);
  const centsPart = String(cents % 100).padStart(2, "0");
  return `${reais.toLocaleString("pt-BR")},${centsPart}`;
}
