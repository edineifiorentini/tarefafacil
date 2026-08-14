import type { ReactNode } from "react";

/**
 * Cabeçalho de página: título + linha de apoio, com espaço opcional à
 * direita para ações. Usado dentro do conteúdo (a barra superior cuida da
 * navegação global).
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-fg text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-fg-secondary mt-0.5 text-[length:var(--text-small-size)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
