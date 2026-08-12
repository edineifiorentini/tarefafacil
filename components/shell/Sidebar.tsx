"use client";

import {
  IconBuildingStore,
  IconCalendarMonth,
  IconLayoutKanban,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SectorForm } from "@/components/sector/SectorForm";
import { SectorNav } from "@/components/sector/SectorNav";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector, Workspace } from "@/types/database";

import { useShell } from "./shell-context";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const destinations = [
  { href: "/hoje", label: "Hoje", icon: IconSun, hint: "1" },
  { href: "/quadro", label: "Quadro", icon: IconLayoutKanban, hint: "2" },
  { href: "/calendario", label: "Calendário", icon: IconCalendarMonth, hint: "3" },
  { href: "/busca", label: "Buscar", icon: IconSearch, hint: "/" },
] as const;

// Estilo compartilhado dos itens de navegação (consistência = mais clean).
function navItemClass(active: boolean) {
  return `group flex items-center gap-3 rounded-md px-3 py-2 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] ${
    active
      ? "bg-selected font-medium text-fg"
      : "text-fg-secondary hover:bg-sunken hover:text-fg"
  }`;
}

export function Sidebar({
  sectors: initialSectors,
  workspaces,
  isAdmin,
}: {
  sectors: Sector[];
  workspaces: Workspace[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id, initialSectors);
  const { openPanel, closePanel, setMobileNavOpen } = useShell();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-[var(--space-card-pad)] py-4">
        <WorkspaceSwitcher workspaces={workspaces} />
      </div>

      <nav aria-label="Navegação principal" className="px-2">
        <ul className="space-y-0.5">
          {destinations.map(({ href, label, icon: Icon, hint }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={navItemClass(isActive(href))}
              >
                <Icon size={20} stroke={1.5} />
                <span className="flex-1">{label}</span>
                <kbd
                  aria-hidden
                  className="tnum rounded-sm border border-line px-1 text-[length:var(--text-caption-size)] text-fg-muted opacity-0 transition-opacity [transition-duration:var(--dur-fast)] group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {hint}
                </kbd>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-auto px-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[length:var(--text-caption-size)] font-medium uppercase tracking-wide text-fg-muted">
            Setores
          </span>
          <button
            type="button"
            aria-label="Novo setor"
            onClick={() =>
              openPanel({
                title: "Novo setor",
                node: <SectorForm mode="create" onDone={closePanel} />,
              })
            }
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
          >
            <IconPlus size={16} stroke={1.5} />
          </button>
        </div>

        <SectorNav sectors={sectors} />
      </div>

      <div className="mt-auto space-y-0.5 border-t border-line p-2">
        {isAdmin ? (
          <Link
            href="/admin"
            aria-current={isActive("/admin") ? "page" : undefined}
            onClick={() => setMobileNavOpen(false)}
            className={navItemClass(isActive("/admin"))}
          >
            <IconBuildingStore size={20} stroke={1.5} />
            Clientes
          </Link>
        ) : null}
        <Link
          href="/config"
          aria-current={isActive("/config") ? "page" : undefined}
          onClick={() => setMobileNavOpen(false)}
          className={navItemClass(isActive("/config"))}
        >
          <IconSettings size={20} stroke={1.5} />
          Configurações
        </Link>
        <div className="flex items-center gap-1">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
