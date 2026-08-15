/**
 * CPF e CNPJ — máscara ao digitar e validação por dígito verificador.
 * Puro e testável: a UI só chama, não repete regra.
 *
 * A validação confere o dígito verificador, não a existência do documento
 * na Receita — isso exigiria integração, que não existe aqui. Documento em
 * branco é considerado válido: o campo é opcional em cliente e organização.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** "12345678901" -> "123.456.789-01" (vai formatando enquanto digita) */
export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** "12345678000199" -> "12.345.678/0001-99" */
export function maskCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskDocument(value: string, type: "pf" | "pj"): string {
  return type === "pf" ? maskCPF(value) : maskCNPJ(value);
}

/** Soma ponderada usada nos dois dígitos verificadores do CPF. */
function cpfCheckDigit(digits: string, factor: number): number {
  let sum = 0;
  for (const digit of digits) {
    sum += Number(digit) * factor;
    factor -= 1;
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCPF(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  // Sequências repetidas passam na conta mas não são CPF válido.
  if (/^(\d)\1{10}$/.test(d)) return false;
  return (
    cpfCheckDigit(d.slice(0, 9), 10) === Number(d[9]) &&
    cpfCheckDigit(d.slice(0, 10), 11) === Number(d[10])
  );
}

/** Pesos do CNPJ: começam em 5 (ou 6) e caem até 2, reiniciando em 9. */
function cnpjCheckDigit(digits: string): number {
  let factor = digits.length - 7;
  let sum = 0;
  for (const digit of digits) {
    sum += Number(digit) * factor;
    factor -= 1;
    if (factor < 2) factor = 9;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCNPJ(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  return (
    cnpjCheckDigit(d.slice(0, 12)) === Number(d[12]) &&
    cnpjCheckDigit(d.slice(0, 13)) === Number(d[13])
  );
}

/** Vazio é válido (campo opcional). Preenchido precisa fechar o dígito. */
export function isValidDocument(value: string, type: "pf" | "pj"): boolean {
  if (onlyDigits(value).length === 0) return true;
  return type === "pf" ? isValidCPF(value) : isValidCNPJ(value);
}

export function documentLabel(type: "pf" | "pj"): string {
  return type === "pf" ? "CPF" : "CNPJ";
}
