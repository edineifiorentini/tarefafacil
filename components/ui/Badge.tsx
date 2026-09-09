import type { ReactNode } from "react";

type Variant = "neutral" | "brand" | "overdue" | "due-soon" | "positive";

const variants: Record<Variant, string> = {
  neutral: "bg-sunken text-fg-secondary",
  brand: "bg-selected text-fg-link",
  overdue: "bg-overdue-bg text-overdue",
  "due-soon": "bg-due-soon-bg text-due-soon",
  // Verde NÃO significa "concluído" neste produto — concluído é cinza com
  // texto riscado. `positive` é dado financeiro que deu certo, e pagamento
  // confirmado é exatamente isso. Os tokens já existiam no tema; faltava a
  // variante para alcançá-los.
  positive: "bg-positive-bg text-positive",
};

export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] font-medium whitespace-nowrap ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
