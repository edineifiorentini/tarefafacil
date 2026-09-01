"use client";

import {
  IconCalendarMonth,
  IconFileText,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLayoutList,
  IconMoneybag,
  IconPlus,
  IconMessages,
  IconBriefcase,
  IconChartFunnel,
  IconChevronRight,
  IconSettings,
  IconSun,
  IconUsers,
  IconChartBar,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SectorForm } from "@/components/sector/SectorForm";
import { SectorNav } from "@/components/sector/SectorNav";
import { useChatUnreadTotal } from "@/lib/queries/useChat";
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

/**
 * O trabalho do dia. Fica sempre aberto e no topo: é para onde se volta
 * dezenas de vezes por dia.
 *
 * "Buscar" saiu da lista de propósito — o campo já está na barra superior,
 * com o mesmo atalho `/`. Item de menu que duplica um campo visível gasta
 * uma linha que os setores estavam pedindo.
 */
const workDestinations: Destination[] = [
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
  { href: "/chat", label: "Chat", icon: IconMessages, hint: "8" },
];

/**
 * Central de relatórios (§26).
 *
 * Fora da lista fixa porque a barra tem pressão de espaço documentada — num
 * notebook de 768px sobravam 34 pixels para doze setores. Só aparece para
 * quem gerencia alguma coisa, que é quem tem o que ler nela.
 *
 * Substituiu o item "Equipe", que virou aba daqui: trocar dois itens por um
 * é melhor que somar.
 */
const reportsDestination: Destination = {
  href: "/relatorios",
  label: "Relatórios",
  icon: IconChartBar,
};

/**
 * O lado comercial, num grupo que recolhe.
 *
 * São telas de entrar, resolver e sair — não de ficar. Ocupavam cinco
 * linhas fixas empurrando os setores para fora da tela: num notebook de
 * 768px de altura sobravam 34 pixels para doze setores.
 *
 * Os atalhos continuam valendo com o grupo fechado: `6` leva a Clientes e
 * `7` ao Funil de qualquer jeito.
 */
const commercialDestinations: Destination[] = [
  { href: "/clientes", label: "Clientes", icon: IconUsers, hint: "6" },
  { href: "/funil", label: "Funil", icon: IconChartFunnel, hint: "7" },
  { href: "/servicos", label: "Serviços", icon: IconBriefcase },
];

// Dado sensível — a RLS já protege; isto só evita oferecer um link que
// levaria a "acesso restrito".
const restrictedDestinations: Destination[] = [
  { href: "/financeiro", label: "Financeiro", icon: IconMoneybag },
  { href: "/contratos", label: "Contratos", icon: IconFileText },
];

/** Cookie do estado do grupo. Vem do servidor para não piscar na abertura. */
export const NAV_COMMERCIAL_COOKIE = "nav_comercial";

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
  badge = 0,
}: {
  destination: Destination;
  active: boolean;
  onNavigate: () => void;
  /** Não lidas. Zero não desenha nada. */
  badge?: number;
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
        {badge > 0 ? (
          <span
            aria-label={`${badge} não lidas`}
            className="tnum shrink-0 rounded-full bg-[var(--brand-600)] px-1.5 text-[length:var(--text-caption-size)] font-medium text-[var(--button-primary-fg)]"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : hint ? (
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
  commercialOpen,
}: {
  sectors: Sector[];
  workspaces: Workspace[];
  /** Estado do grupo Comercial, vindo do cookie lido no servidor. */
  commercialOpen: boolean;
}) {
  const pathname = usePathname();
  const [comercialAberto, setComercialAberto] = useState(commercialOpen);
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id, initialSectors);
  const { openPanel, closePanel, setMobileNavOpen } = useShell();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canManageBusiness = myRole === "owner" || myRole === "admin";
  // Gestor de setor NÃO é admin (0082): admin abriria o financeiro junto.
  const gerenciaEquipe =
    canManageBusiness || sectors.some((s) => s.responsavel_id === myId);
  // O contador é o que faz alguém lembrar de abrir o chat: sem ele, só se
  // descobre mensagem nova entrando lá.
  const chatUnread = useChatUnreadTotal(workspace.id, myId ?? null);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const closeMobile = () => setMobileNavOpen(false);

  // Quem administra vê Financeiro e Contratos dentro do mesmo grupo.
  const comerciais = canManageBusiness
    ? [...commercialDestinations, ...restrictedDestinations]
    : commercialDestinations;

  function toggleComercial() {
    const novo = !comercialAberto;
    setComercialAberto(novo);
    // Cookie, não localStorage: o servidor lê na próxima visita e a barra já
    // vem no estado certo, sem o grupo abrir e fechar na frente da pessoa.
    document.cookie = `${NAV_COMMERCIAL_COOKIE}=${novo ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-4">
        <WorkspaceSwitcher workspaces={workspaces} />
      </div>

      <nav aria-label="Navegação principal" className="px-3">
        <ul className="space-y-0.5">
          {workDestinations.map((destination) => (
            <NavItem
              key={destination.href}
              destination={destination}
              active={isActive(destination.href)}
              onNavigate={closeMobile}
              badge={destination.href === "/chat" ? chatUnread : 0}
            />
          ))}
          {gerenciaEquipe ? (
            <NavItem
              destination={reportsDestination}
              active={isActive(reportsDestination.href)}
              onNavigate={closeMobile}
              badge={0}
            />
          ) : null}
        </ul>

        <button
          type="button"
          onClick={toggleComercial}
          aria-expanded={comercialAberto}
          aria-controls="nav-comercial"
          className="text-fg-muted hover:text-fg mt-3 flex w-full items-center gap-1 px-3 py-1 text-[length:var(--text-caption-size)] font-semibold tracking-[0.08em] uppercase transition-colors [transition-duration:var(--dur-fast)]"
        >
          <IconChevronRight
            size={14}
            stroke={2}
            aria-hidden
            className={`shrink-0 transition-transform [transition-duration:var(--dur-fast)] ${
              comercialAberto ? "rotate-90" : ""
            }`}
          />
          Comercial
          {/* Fechado, o grupo precisa dizer que existe algo aqui dentro. */}
          {!comercialAberto ? (
            <span className="tnum text-fg-muted ml-auto font-normal tracking-normal">
              {comerciais.length}
            </span>
          ) : null}
        </button>

        {comercialAberto ? (
          <ul id="nav-comercial" className="space-y-0.5">
            {comerciais.map((destination) => (
              <NavItem
                key={destination.href}
                destination={destination}
                active={isActive(destination.href)}
                onNavigate={closeMobile}
              />
            ))}
          </ul>
        ) : null}
      </nav>

      {/* `min-h`: os setores são a espinha do produto e não podem ser o
          único bloco que cede espaço. Antes disto, num notebook de 768px,
          sobravam 34 pixels para doze setores. */}
      <div className="mt-4 min-h-48 flex-1 overflow-auto px-3">
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
