"use client";

import { IconMenu2, IconPlus, IconSearch } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { QuickAdd } from "@/components/task/QuickAdd";

import { useShell } from "./shell-context";

const staticTitles: Record<string, string> = {
  "/hoje": "Hoje",
  "/quadro": "Quadro",
  "/calendario": "Calendário",
  "/busca": "Buscar",
  "/clientes": "Clientes",
  "/admin": "Contas",
  "/config": "Configurações",
};

function titleFor(path: string): string {
  if (staticTitles[path]) return staticTitles[path];
  if (path.startsWith("/setor")) return "Setor";
  if (path.startsWith("/projeto")) return "Projeto";
  return "TarefaFácil";
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openPanel, setMobileNavOpen } = useShell();
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/busca?q=${encodeURIComponent(q)}` : "/busca");
  }

  return (
    <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3">
      <button
        type="button"
        aria-label="Abrir navegação"
        onClick={() => setMobileNavOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg lg:hidden"
      >
        <IconMenu2 size={20} stroke={1.5} />
      </button>

      <h1 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
        {titleFor(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <form onSubmit={submitSearch} className="relative hidden sm:block">
          <IconSearch
            aria-hidden
            size={18}
            stroke={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            id="app-search"
            type="search"
            aria-label="Buscar"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 rounded-full border border-line bg-page py-2 pl-10 pr-4 text-[length:var(--text-small-size)] text-fg transition-colors [transition-duration:var(--dur-fast)] placeholder:text-fg-muted focus-visible:border-line-strong"
          />
        </form>

        <button
          type="button"
          onClick={() => openPanel({ title: "Nova tarefa", node: <QuickAdd /> })}
          className="inline-flex items-center gap-2 rounded-sm bg-[var(--button-primary-bg)] px-3 py-2 text-[length:var(--text-small-size)] text-[var(--button-primary-fg)] transition-colors [transition-duration:var(--dur-fast)] hover:bg-[var(--button-primary-bg-hover)]"
        >
          <IconPlus size={18} stroke={1.5} />
          <span className="hidden sm:inline">Nova tarefa</span>
        </button>
      </div>
    </header>
  );
}
