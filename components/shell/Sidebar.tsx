"use client";

import {
  IconCalendarMonth,
  IconLayoutKanban,
  IconPlus,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { SectorForm } from "@/components/sector/SectorForm";
import { SectorNav } from "@/components/sector/SectorNav";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector } from "@/types/database";

import { useShell } from "./shell-context";

const destinations = [
  { href: "/hoje", label: "Hoje", icon: IconSun, hint: "1" },
  { href: "/quadro", label: "Quadro", icon: IconLayoutKanban, hint: "2" },
  { href: "/calendario", label: "Calendário", icon: IconCalendarMonth, hint: "3" },
] as const;

export function Sidebar({ sectors: initialSectors }: { sectors: Sector[] }) {
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
        <span className="text-[length:var(--text-h3-size)] font-medium text-fg">
          TarefaFácil
        </span>
      </div>

      <nav aria-label="Navegação principal" className="px-2">
        <ul className="space-y-1">
          {destinations.map(({ href, label, icon: Icon, hint }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={`group flex items-center gap-3 rounded-sm px-3 py-2 transition-colors [transition-duration:var(--dur-fast)] ${
                  isActive(href)
                    ? "bg-selected text-fg"
                    : "text-fg-secondary hover:bg-sunken hover:text-fg"
                }`}
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

      <div className="mt-auto space-y-1 border-t border-line p-2">
        <Link
          href="/config"
          aria-current={isActive("/config") ? "page" : undefined}
          onClick={() => setMobileNavOpen(false)}
          className={`flex items-center gap-3 rounded-sm px-3 py-2 transition-colors [transition-duration:var(--dur-fast)] ${
            isActive("/config")
              ? "bg-selected text-fg"
              : "text-fg-secondary hover:bg-sunken hover:text-fg"
          }`}
        >
          <IconSettings size={20} stroke={1.5} />
          Configurações
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
