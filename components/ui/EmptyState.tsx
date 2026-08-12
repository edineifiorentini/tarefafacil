import type { ReactNode } from "react";

import type { IconComponent } from "./types";

// Estado vazio como convite (design): ícone num círculo suave, título,
// linha de apoio e um CTA opcional.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[var(--max-width-read)] flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-fg-muted">
        <Icon size={28} stroke={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[length:var(--text-h3-size)] font-semibold text-fg">
          {title}
        </p>
        {description ? <p className="text-fg-secondary">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
