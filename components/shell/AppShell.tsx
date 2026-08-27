"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";

import { TrialBanner } from "@/components/billing/TrialBanner";
import { GcalReconnectBanner } from "@/components/gcal/GcalReconnectBanner";
import { QuickAdd } from "@/components/task/QuickAdd";
import { useGcalPoller } from "@/lib/queries/useGcal";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector, Workspace } from "@/types/database";

import { DetailPanel } from "./DetailPanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useShell } from "./shell-context";

export function AppShell({
  sectors,
  workspaces,
  isAdmin,
  commercialOpen,
  children,
}: {
  sectors: Sector[];
  workspaces: Workspace[];
  isAdmin: boolean;
  /** Grupo Comercial aberto? Vem do cookie, lido no servidor. */
  commercialOpen: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const { openPanel, mobileNavOpen, setMobileNavOpen } = useShell();

  // Sincronização de entrada do Google por polling (design 9.5, E16).
  useGcalPoller(workspace.id);

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

      // O mapa precisa bater com as dicas exibidas na Sidebar.
      const jumps: Record<string, string> = {
        "1": "/dashboard",
        "2": "/hoje",
        "3": "/lista",
        "4": "/quadro",
        "5": "/calendario",
        "6": "/clientes",
        "7": "/funil",
        "8": "/chat",
      };

      if (jumps[e.key]) {
        router.push(jumps[e.key]);
        return;
      }

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
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, openPanel]);

  return (
    <div className="flex h-dvh">
      {/* Sidebar — desktop (>=1024px). Vidro perolado, divisão só à direita. */}
      <aside className="tf-glass-edge hidden w-[248px] shrink-0 lg:block">
        <Sidebar
          sectors={sectors}
          workspaces={workspaces}
          commercialOpen={commercialOpen}
        />
      </aside>

      {/* Sidebar — mobile (sheet à esquerda com overlay) */}
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)] lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="tf-glass-strong fixed inset-y-0 left-0 z-50 w-[248px] outline-none data-[state=closed]:[animation:tf-slide-out-left_var(--dur-base)_ease-in] data-[state=open]:[animation:tf-slide-in-left_var(--dur-slow)_var(--ease-out)] lg:hidden"
          >
            <Dialog.Title className="sr-only">Navegação</Dialog.Title>
            <Sidebar
              sectors={sectors}
              workspaces={workspaces}
              commercialOpen={commercialOpen}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar isAdmin={isAdmin} />
        <GcalReconnectBanner />
        <TrialBanner />
        {/* Transparente: o ambiente do body aparece por baixo do conteúdo.
            O `pt` fica AQUI e não no TopBar porque este é o elemento que rola:
            folga acima da área de rolagem some no primeiro pixel de scroll, e
            o primeiro cartão passa a encostar na borda, cortado. */}
        <main className="min-h-0 flex-1 overflow-auto pt-8">{children}</main>
      </div>

      {/* Painel de detalhe */}
      <DetailPanel />
    </div>
  );
}
