"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";

import { QuickAdd } from "@/components/task/QuickAdd";
import type { Sector } from "@/types/database";

import { DetailPanel } from "./DetailPanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useShell } from "./shell-context";

export function AppShell({
  sectors,
  children,
}: {
  sectors: Sector[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { openPanel, mobileNavOpen, setMobileNavOpen } = useShell();

  // Atalhos globais (design 11.2). Ignora quando o foco está em campo de texto.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          openPanel({ title: "Nova tarefa", node: <QuickAdd /> });
          break;
        case "/":
          e.preventDefault();
          document.getElementById("app-search")?.focus();
          break;
        case "1":
          router.push("/hoje");
          break;
        case "2":
          router.push("/quadro");
          break;
        case "3":
          router.push("/calendario");
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, openPanel]);

  return (
    <div className="flex h-dvh">
      {/* Sidebar — desktop (>=1024px) */}
      <aside className="hidden w-[240px] shrink-0 border-r border-line bg-card lg:block">
        <Sidebar sectors={sectors} />
      </aside>

      {/* Sidebar — mobile (sheet à esquerda com overlay) */}
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)] lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[240px] border-r border-line bg-card outline-none data-[state=closed]:[animation:tf-slide-out-left_var(--dur-base)_ease-in] data-[state=open]:[animation:tf-slide-in-left_var(--dur-slow)_var(--ease-out)] lg:hidden"
          >
            <Dialog.Title className="sr-only">Navegação</Dialog.Title>
            <Sidebar sectors={sectors} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto bg-page">{children}</main>
      </div>

      {/* Painel de detalhe */}
      <DetailPanel />
    </div>
  );
}
