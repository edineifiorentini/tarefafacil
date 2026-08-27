import type { ReactNode } from "react";

/**
 * Cabeçalho das páginas da administração. Mesmo ritmo da visão geral, para
 * as telas não parecerem de produtos diferentes.
 */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-fg text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

/** Contêiner padrão das páginas da administração. */
export const ADMIN_CONTAINER =
  "mx-auto flex w-full max-w-[var(--max-width-app)] flex-col gap-[var(--space-block-gap)] px-4 pb-8 lg:px-6";
