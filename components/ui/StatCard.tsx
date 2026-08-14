import type { ReactNode } from "react";

import type { IconComponent } from "./types";

// Cartão de indicador reusado por Dashboard e Financeiro. `value` aceita
// ReactNode (não só número) para caber valor em moeda já formatado ou uma
// máscara ("•••") quando o usuário oculta os valores.
export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  tone: string;
}) {
  return (
    <div className="border-line bg-card flex flex-col gap-2 rounded-md border p-4">
      <div className="text-fg-muted flex items-center gap-2">
        <Icon size={18} stroke={1.5} />
        <span className="text-[length:var(--text-caption-size)] tracking-wide uppercase">
          {label}
        </span>
      </div>
      <span
        className="tnum text-[length:var(--text-h1-size)] leading-none font-semibold"
        style={{ color: tone }}
      >
        {value}
      </span>
    </div>
  );
}
