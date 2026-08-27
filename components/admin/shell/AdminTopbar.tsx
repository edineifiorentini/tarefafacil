"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { IconMenu2, IconPlus, IconSearch } from "@tabler/icons-react";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Barra superior da administração (especificação 7.2).
 *
 * O sino da imagem de referência NÃO está aqui. A central de notificações da
 * seção 22 precisa de uma tabela de eventos administrativos que ainda não
 * existe, e um sino com número fixo seria exatamente a "implementação
 * simulada" que a restrição 33 proíbe. Entra quando os eventos existirem.
 *
 * A busca hoje leva à listagem de empresas já filtrada. A busca global
 * agrupada por categoria (7.3) depende dos módulos de Usuários e Assinaturas;
 * o campo é o mesmo, o destino é que cresce.
 */
export function AdminTopbar({
  email,
  onAbrirMenu,
}: {
  email: string;
  onAbrirMenu: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const campo = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K foca a busca — o atalho anunciado no próprio campo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campo.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const termo = q.trim();
    router.push(
      termo
        ? `/admin/empresas?q=${encodeURIComponent(termo)}`
        : "/admin/empresas"
    );
  }

  const iniciais = email.slice(0, 2).toUpperCase();

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 pt-5 pb-5 lg:flex-nowrap lg:px-6">
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir navegação"
        className="text-fg-secondary hover:bg-hover rounded-sm p-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] lg:hidden"
      >
        <IconMenu2 size={20} stroke={1.75} aria-hidden />
      </button>

      <form
        onSubmit={buscar}
        className="order-last w-full min-w-0 lg:order-none lg:max-w-md"
      >
        <label htmlFor="admin-search" className="sr-only">
          Buscar empresa, usuário ou e-mail
        </label>
        <div className="tf-glass border-line focus-within:border-line-strong flex items-center gap-2 rounded-md border px-3 py-2">
          <IconSearch
            size={18}
            stroke={1.75}
            className="text-fg-muted shrink-0"
            aria-hidden
          />
          <input
            id="admin-search"
            ref={campo}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa, usuário ou e-mail"
            className="text-fg placeholder:text-fg-muted min-w-0 flex-1 bg-transparent text-[length:var(--text-small-size)] outline-none"
          />
          <kbd className="text-fg-muted hidden shrink-0 text-[length:var(--text-caption-size)] sm:block">
            ⌘K
          </kbd>
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <div className="border-line flex items-center gap-2 rounded-full border px-1 py-1 pr-3">
          <span
            aria-hidden
            className="bg-selected text-fg-link flex size-7 items-center justify-center rounded-full text-[length:var(--text-caption-size)] font-semibold"
          >
            {iniciais}
          </span>
          <span className="text-fg-secondary hidden text-[length:var(--text-small-size)] sm:block">
            {email}
          </span>
        </div>

        <a
          href="/admin/empresas?novo=1"
          className="tf-lift flex items-center gap-1.5 rounded-md bg-[var(--button-primary-bg)] px-3 py-2 text-[length:var(--text-small-size)] font-medium text-[var(--button-primary-fg)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <IconPlus size={18} stroke={2} aria-hidden />
          Novo cliente
        </a>
      </div>
    </header>
  );
}
