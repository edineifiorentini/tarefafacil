"use client";

import {
  IconBuildingStore,
  IconChevronDown,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { QuickAdd } from "@/components/task/QuickAdd";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/workspace/NotificationBell";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { useShell } from "./shell-context";

type PageMeta = { title: string; subtitle?: string };

const staticPages: Record<string, PageMeta> = {
  "/dashboard": {
    title: "Visão geral",
    subtitle: "Acompanhe demandas, entregas e desempenho da equipe.",
  },
  "/hoje": {
    title: "Hoje",
    subtitle: "O que vence agora e nos próximos dias.",
  },
  "/lista": {
    title: "Lista",
    subtitle: "Todas as demandas, com filtros e ações em lote.",
  },
  "/quadro": { title: "Quadro", subtitle: "Fluxo das demandas por coluna." },
  "/calendario": { title: "Calendário", subtitle: "Prazos e projetos no mês." },
  "/clientes": {
    title: "Clientes",
    subtitle: "Carteira, situação e demandas por cliente.",
  },
  "/chat": {
    title: "Chat",
    subtitle: "Conversa da equipe por setor.",
  },
  "/busca": {
    title: "Buscar",
    subtitle: "Encontre demandas por texto e filtros.",
  },
  "/funil": {
    title: "Funil",
    subtitle: "Negociações em andamento, por etapa.",
  },
  "/planos": {
    title: "Planos",
    subtitle: "Escolha o plano da sua empresa.",
  },
  "/servicos": {
    title: "Serviços",
    subtitle: "O que você vende, e por quanto.",
  },
  "/financeiro": { title: "Financeiro", subtitle: "Fechamento do mês." },
  "/contratos": {
    title: "Contratos",
    subtitle: "Vigência, honorários e assinatura.",
  },
  "/admin": {
    title: "Plataforma",
    subtitle: "Empresas, planos e acessos.",
  },
  "/config": {
    title: "Configurações",
    subtitle: "Workspace, equipe e integrações.",
  },
};

function pageMetaFor(path: string): PageMeta {
  const exact = staticPages[path];
  if (exact) return exact;
  if (path.startsWith("/setor")) return { title: "Setor" };
  if (path.startsWith("/projeto")) return { title: "Projeto" };
  return { title: "TarefaFácil" };
}

export function TopBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const workspace = useWorkspace();
  const { openPanel, setMobileNavOpen } = useShell();
  const { data: myId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const [query, setQuery] = useState("");

  const me = members.find((m) => m.user_id === myId);
  const myName = me?.display_name ?? me?.email ?? "Você";
  const { title, subtitle } = pageMetaFor(pathname);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/busca?q=${encodeURIComponent(q)}` : "/busca");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    // Em tela estreita o título desce para a própria linha: disputando espaço
    // com menu, busca, sino, conta e "Nova tarefa", sobravam 63px e "Visão
    // geral" virava "Vis…". Título de página não pode sair cortado.
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 lg:flex-nowrap lg:px-6">
      <button
        type="button"
        aria-label="Abrir navegação"
        onClick={() => setMobileNavOpen(true)}
        className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)] lg:hidden"
      >
        <IconMenu2 size={20} stroke={1.75} />
      </button>

      <div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
        <h1 className="text-fg truncate text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-fg-secondary mt-0.5 hidden truncate text-[length:var(--text-small-size)] sm:block">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
        <form onSubmit={submitSearch} className="relative hidden md:block">
          <IconSearch
            aria-hidden
            size={18}
            stroke={1.75}
            className="text-fg-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            id="app-search"
            type="search"
            aria-label="Buscar"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="tf-glass text-fg placeholder:text-fg-muted h-11 w-56 rounded-sm py-2 pr-4 pl-11 text-[length:var(--text-small-size)] transition-[width,border-color] [transition-duration:var(--dur-base)] focus:w-72 lg:w-64"
          />
        </form>

        {/* Busca em telas estreitas: só o atalho, sem ocupar a linha inteira */}
        <Link
          href="/busca"
          aria-label="Buscar"
          className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)] md:hidden"
        >
          <IconSearch size={20} stroke={1.75} />
        </Link>

        <NotificationBell />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Conta de ${myName}`}
              className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex h-11 items-center gap-1 rounded-sm pr-1.5 pl-1 transition-colors [transition-duration:var(--dur-fast)]"
            >
              <Avatar name={myName} src={me?.avatar_url ?? undefined} />
              <IconChevronDown size={16} stroke={1.75} aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="tf-glass-strong z-50 min-w-48 overflow-hidden rounded-md p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
            >
              <DropdownMenu.Label className="text-fg-muted truncate px-2 py-1.5 text-[length:var(--text-caption-size)]">
                {myName}
              </DropdownMenu.Label>
              {isAdmin ? (
                <DropdownMenu.Item asChild>
                  <Link
                    href="/admin"
                    className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconBuildingStore size={16} stroke={1.75} />
                    Plataforma
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Item asChild>
                <Link
                  href="/config"
                  className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                >
                  <IconSettings size={16} stroke={1.75} />
                  Configurações
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => void signOut()}
                className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
              >
                <IconLogout size={16} stroke={1.75} />
                Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          type="button"
          onClick={() =>
            openPanel({ title: "Nova tarefa", node: <QuickAdd /> })
          }
          className="tf-sheen inline-flex h-11 items-center gap-2 rounded-sm bg-[var(--button-primary-bg)] px-4 text-[length:var(--text-small-size)] font-medium whitespace-nowrap text-[var(--button-primary-fg)] shadow-[var(--shadow-peek)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-[var(--button-primary-bg-hover)]"
        >
          <IconPlus size={18} stroke={2} aria-hidden />
          <span className="hidden sm:inline">Nova tarefa</span>
        </button>
      </div>
    </header>
  );
}
