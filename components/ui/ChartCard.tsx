import Link from "next/link";
import type { ReactNode } from "react";

import { IconChevronRight } from "@tabler/icons-react";

import { IconTile } from "./IconTile";
import type { IconComponent } from "./types";

/**
 * Casca dos cartões grandes do painel: cabeçalho com ícone + título, uma
 * área livre de conteúdo e um rodapé opcional com link. Superfície sólida.
 */
export function ChartCard({
  icon,
  title,
  subtitle,
  tone = "var(--chart-1)",
  actions,
  footer,
  className,
  children,
}: {
  icon: IconComponent;
  title: string;
  subtitle?: string;
  tone?: string;
  /** Canto superior direito — seletor de período, menu, link. */
  actions?: ReactNode;
  footer?: { label: string; href: string; icon?: IconComponent };
  className?: string;
  children: ReactNode;
}) {
  const FooterIcon = footer?.icon;

  return (
    <section
      className={`border-line bg-card flex flex-col rounded-md border shadow-[var(--shadow-card)] ${className ?? ""}`}
    >
      <header className="flex items-start gap-3 p-[var(--space-card-pad)] pb-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="text-fg truncate text-[length:var(--text-h3-size)] leading-[var(--text-h3-line)] font-semibold">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-fg-secondary truncate text-[length:var(--text-small-size)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>

      <div className="min-w-0 flex-1 px-[var(--space-card-pad)] pb-[var(--space-card-pad)]">
        {children}
      </div>

      {footer ? (
        <Link
          href={footer.href}
          className="group border-line text-fg-link hover:bg-hover flex items-center gap-2 border-t px-[var(--space-card-pad)] py-3 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)]"
        >
          {FooterIcon ? (
            <FooterIcon size={16} stroke={1.75} aria-hidden />
          ) : null}
          <span className="flex-1">{footer.label}</span>
          <IconChevronRight
            size={16}
            stroke={1.75}
            aria-hidden
            className="text-fg-muted transition-transform [transition-duration:var(--dur-fast)] group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </section>
  );
}
