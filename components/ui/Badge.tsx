import type { ReactNode } from "react";

type Variant = "neutral" | "brand" | "overdue" | "due-soon";

const variants: Record<Variant, string> = {
  neutral: "bg-sunken text-fg-secondary",
  brand: "bg-selected text-fg-link",
  overdue: "bg-overdue-bg text-overdue",
  "due-soon": "bg-due-soon-bg text-due-soon",
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
