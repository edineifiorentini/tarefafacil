"use client";

import { useState, type ReactNode } from "react";

import { Dialog } from "radix-ui";

import { AdminBrand } from "./AdminBrand";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

/**
 * Casca da administração da plataforma.
 *
 * Deliberadamente NÃO reaproveita `AppShell`: aquela casca carrega setores,
 * quadro, atalhos de navegação do produto e o painel de detalhe de demanda —
 * nada disso pertence aqui, e a especificação (4) proíbe misturar os dois
 * ambientes. O que se reaproveita são os tokens, os átomos e os gráficos.
 *
 * A área de rolagem é o `<main>`, e o respiro do topo vive DENTRO dela: folga
 * acima da borda de rolagem some no primeiro pixel de scroll e o primeiro
 * cartão encosta na borda, cortado.
 */
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const [navAberta, setNavAberta] = useState(false);

  return (
    <div className="bg-page flex h-dvh">
      <AdminBrand />

      {/* Desktop: fixa. */}
      <aside className="tf-glass-edge hidden w-[248px] shrink-0 lg:block">
        <AdminSidebar />
      </aside>

      {/* Mobile e tablet: gaveta. */}
      <Dialog.Root open={navAberta} onOpenChange={setNavAberta}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)] lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="tf-glass-strong fixed inset-y-0 left-0 z-50 w-[248px] outline-none data-[state=closed]:[animation:tf-slide-out-left_var(--dur-base)_ease-in] data-[state=open]:[animation:tf-slide-in-left_var(--dur-slow)_var(--ease-out)] lg:hidden"
          >
            <Dialog.Title className="sr-only">Administração</Dialog.Title>
            <AdminSidebar onNavigate={() => setNavAberta(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar email={email} onAbrirMenu={() => setNavAberta(true)} />
        <main className="min-h-0 flex-1 overflow-auto pt-2">{children}</main>
      </div>
    </div>
  );
}
