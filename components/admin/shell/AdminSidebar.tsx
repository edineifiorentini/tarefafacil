"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  IconArrowLeft,
  IconBuilding,
  IconCreditCard,
  IconFileDescription,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
  IconStack2,
  IconTicket,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import { createClient } from "@/lib/supabase/client";

/**
 * Navegação da administração (especificação 4).
 *
 * Os itens ainda não construídos aparecem marcados como "em breve" em vez de
 * sumirem: esconder metade da estrutura faria o painel parecer menor do que
 * o plano, e um link que leva a lugar nenhum é pior do que um rótulo honesto.
 * A página de destino explica o que vai morar ali.
 */

type Item = {
  href: string;
  label: string;
  icon: typeof IconLayoutDashboard;
  /** Ainda sem tela construída. */
  emBreve?: boolean;
};

const ITENS: Item[] = [
  { href: "/admin", label: "Visão geral", icon: IconLayoutDashboard },
  { href: "/admin/empresas", label: "Empresas", icon: IconBuilding },
  { href: "/admin/usuarios", label: "Usuários", icon: IconUsers },
  {
    href: "/admin/assinaturas",
    label: "Assinaturas",
    icon: IconCreditCard,
    emBreve: true,
  },
  { href: "/admin/planos", label: "Planos", icon: IconStack2 },
  { href: "/admin/afiliados", label: "Afiliados", icon: IconUsersGroup },
  { href: "/admin/cupons", label: "Cupons", icon: IconTicket, emBreve: true },
  { href: "/admin/auditoria", label: "Auditoria", icon: IconFileDescription },
];

function ativo(pathname: string, href: string): boolean {
  // "/admin" só acende na própria visão geral; os demais acendem também nas
  // subpáginas (detalhe de empresa mantém "Empresas" aceso).
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function classeItem(estaAtivo: boolean): string {
  const base =
    "flex items-center gap-3 rounded-md px-3 py-2 text-[length:var(--text-small-size)] outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";
  return estaAtivo
    ? `${base} tf-glass bg-selected text-fg-link font-medium`
    : `${base} text-fg-secondary hover:bg-hover hover:text-fg`;
}

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="Administração"
      className="flex h-full flex-col gap-1 px-3 py-4"
    >
      <div className="flex items-center gap-2 px-3 pb-4">
        <span className="text-[length:var(--text-h3-size)] font-semibold tracking-tight">
          Plataforma
        </span>
        {/* Selo pedido na 4: quem está aqui precisa saber que não é o app. */}
        <span className="bg-selected text-fg-link rounded-xs px-1.5 py-0.5 text-[length:var(--text-caption-size)] font-semibold tracking-wide">
          ADMIN
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {ITENS.map((item) => {
          const Icone = item.icon;
          const estaAtivo = ativo(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={estaAtivo ? "page" : undefined}
                className={classeItem(estaAtivo)}
              >
                <Icone size={20} stroke={1.75} aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                {item.emBreve ? (
                  <span className="text-fg-muted text-[length:var(--text-caption-size)]">
                    em breve
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-line mt-auto flex flex-col gap-1 border-t pt-3">
        <Link
          href="/admin/configuracoes"
          onClick={onNavigate}
          aria-current={
            ativo(pathname, "/admin/configuracoes") ? "page" : undefined
          }
          className={classeItem(ativo(pathname, "/admin/configuracoes"))}
        >
          <IconSettings size={20} stroke={1.75} aria-hidden />
          <span className="flex-1 truncate">Configurações</span>
        </Link>

        {/* Especificação 4: a volta ao ambiente comum é uma ação explícita. */}
        <Link href="/hoje" onClick={onNavigate} className={classeItem(false)}>
          <IconArrowLeft size={20} stroke={1.75} aria-hidden />
          <span className="flex-1 truncate">Voltar ao app</span>
        </Link>

        <button
          type="button"
          onClick={() => void sair()}
          className={`${classeItem(false)} w-full text-left`}
        >
          <IconLogout size={20} stroke={1.75} aria-hidden />
          <span className="flex-1 truncate">Sair</span>
        </button>
      </div>
    </nav>
  );
}
