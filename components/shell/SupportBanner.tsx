"use client";

import { IconLifebuoy } from "@tabler/icons-react";
import { useState } from "react";

/**
 * Faixa fixa de acesso de suporte.
 *
 * Fica no topo, em cima de tudo, e **não fecha**. É a diferença entre
 * suporte e bisbilhotice: quem está dentro da conta de outra empresa
 * precisa ver a todo momento que não está na própria. O maior risco aqui
 * não é o acesso indevido — é o admin esquecer que está dentro da conta de
 * um cliente e apagar algo achando que é dele.
 *
 * O prazo aparece porque a sessão vence sozinha, e sumir sem aviso no meio
 * de um diagnóstico parece defeito.
 */
export function SupportBanner({
  workspaceName,
  adminEmail,
  expiresAt,
}: {
  workspaceName: string;
  adminEmail: string;
  /** ISO. */
  expiresAt: string;
}) {
  const [saindo, setSaindo] = useState(false);

  const hora = new Date(expiresAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function sair() {
    setSaindo(true);
    await fetch("/api/admin/support/stop", { method: "POST" });
    // Recarga completa e não router.push: a sessão trocou de pessoa nos
    // cookies, e a navegação do Next reaproveitaria o cache do inquilino
    // anterior — a tela abriria com dados de quem não está mais logado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--tone-amber)] bg-[color-mix(in_srgb,var(--tone-amber)_14%,var(--bg))] px-4 py-2"
    >
      <IconLifebuoy
        size={16}
        stroke={1.75}
        className="shrink-0 text-[var(--tone-amber)]"
        aria-hidden
      />
      <span className="text-fg text-[length:var(--text-small-size)] font-medium">
        Acesso de suporte a {workspaceName}
      </span>
      <span className="text-fg-secondary text-[length:var(--text-caption-size)]">
        Você é {adminEmail}, não o cliente. Tudo o que fizer fica registrado no
        histórico dele. Encerra às {hora}
      </span>
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        className="text-fg hover:bg-hover ml-auto shrink-0 rounded-sm border border-[var(--tone-amber)] px-2 py-0.5 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-60"
      >
        {saindo ? "Encerrando…" : "Encerrar suporte"}
      </button>
    </div>
  );
}
