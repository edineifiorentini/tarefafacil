"use client";

import {
  IconBuildingStore,
  IconCalendarMonth,
  IconFileText,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLayoutList,
  IconMoneybag,
  IconPlus,
  IconMessages,
  IconSearch,
  IconSettings,
  IconSun,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SectorForm } from "@/components/sector/SectorForm";
import { SectorNav } from "@/components/sector/SectorNav";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { IconComponent } from "@/components/ui/types";
import type { Sector, Workspace } from "@/types/database";

import { useShell } from "./shell-context";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type Destination = {
  href: string;
  label: string;
  icon: IconComponent;
  /** Atalho de teclado — precisa bater com o mapa do AppShell. */
  hint?: string;
};

const destinations: Destination[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: IconLayoutDashboard,
    hint: "1",
  },
  { href: "/hoje", label: "Hoje", icon: IconSun, hint: "2" },
  { href: "/lista", label: "Lista", icon: IconLayoutList, hint: "3" },
  { href: "/quadro", label: "Quadro", icon: IconLayoutKanban, hint: "4" },
  {
    href: "/calendario",
    label: "Calendário",
    icon: IconCalendarMonth,
    hint: "5",
  },
  { href: "/clientes", label: "Clientes", icon: IconUsers, hint: "6" },
  { href: "/chat", label: "Chat", icon: IconMessages, hint: "7" },
  { href: "/busca", label: "Buscar", icon: IconSearch, hint: "/" },
];

// Módulos com dado sensível — a RLS já protege; isto só evita oferecer um
// link que levaria a "acesso restrito".
const businessDestinations: Destination[] = [
  { href: "/financeiro", label: "Financeiro", icon: IconMoneybag },
  { href: "/contratos", label: "Contratos", icon: IconFileText },
];

/** Altura de 44px no toque, 40px no ponteiro (alvo confortável em ambos). */
const itemBase =
  "group flex h-11 items-center gap-3 rounded-sm px-3 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] lg:h-10";

function navItemClass(active: boolean) {
  return `${itemBase} ${
    active
      ? "tf-liquid bg-selected font-medium text-fg-link"
      : "text-fg-secondary hover:bg-hover hover:text-fg"
  }`;
}

function NavItem({
  destination,
  active,
  onNavigate,
}: {
  destination: Destination;
  active: boolean;
  onNavigate: () => void;
}) {
  const { href, label, icon: Icon, hint } = destination;
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={navItemClass(active)}
      >
        <Icon size={20} stroke={1.75} aria-hidden />
        <span className="flex-1 truncate">{label}</span>
        {hint ? (
          <kbd
            aria-hidden
            className="tnum border-line text-fg-muted rounded-xs border px-1 text-[length:var(--text-caption-size)] opacity-0 transition-opacity [transition-duration:var(--dur-fast)] group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {hint}
          </kbd>
        ) : null}
      </Link>
    </li>
  );
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
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManageBusiness = myRole === "owner" || myRole === "admin";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const closeMobile = () => setMobileNavOpen(false);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-4">
        <WorkspaceSwitcher workspaces={workspaces} />
      </div>

      <nav aria-label="Navegação principal" className="px-3">
        <ul className="space-y-0.5">
          {destinations.map((destination) => (
            <NavItem
              key={destination.href}
              destination={destination}
              active={isActive(destination.href)}
              onNavigate={closeMobile}
            />
          ))}
          {canManageBusiness
            ? businessDestinations.map((destination) => (
                <NavItem
                  key={destination.href}
                  destination={destination}
                  active={isActive(destination.href)}
                  onNavigate={closeMobile}
                />
              ))
            : null}
        </ul>
      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-auto px-3">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-fg-muted text-[length:var(--text-caption-size)] font-semibold tracking-[0.08em] uppercase">
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
            className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-6 w-6 items-center justify-center rounded-xs transition-colors [transition-duration:var(--dur-fast)]"
          >
            <IconPlus size={16} stroke={1.75} />
          </button>
        </div>

        <SectorNav sectors={sectors} />
      </div>

      <div className="border-line mt-auto space-y-0.5 border-t p-3">
        {isAdmin ? (
          <Link
            href="/admin"
            aria-current={isActive("/admin") ? "page" : undefined}
            onClick={closeMobile}
            className={navItemClass(isActive("/admin"))}
          >
            <IconBuildingStore size={20} stroke={1.75} aria-hidden />
            <span className="flex-1 truncate">Contas</span>
          </Link>
        ) : null}
        <Link
          href="/config"
          aria-current={isActive("/config") ? "page" : undefined}
          onClick={closeMobile}
          className={navItemClass(isActive("/config"))}
        >
          <IconSettings size={20} stroke={1.75} aria-hidden />
          <span className="flex-1 truncate">Configurações</span>
        </Link>
        <div className="flex items-center gap-1">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
