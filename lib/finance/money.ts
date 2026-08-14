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
