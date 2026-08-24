"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useGcalStatus } from "@/lib/queries/useGcal";

/**
 * Situação e botões da conexão com o Google Agenda.
 *
 * Só a ação: a moldura, o ícone e o nome vêm do cartão do catálogo. Antes
 * isto era um card inteiro (`GcalConnectCard`), que dentro da grade de
 * integrações viraria card dentro de card.
 *
 * Lê o mesmo `useGcalStatus` que o painel — o TanStack deduplica pela chave,
 * então não há requisição a mais.
 */
export function GcalConnectAction() {
  const { data: status, isLoading } = useGcalStatus();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/gcal/disconnect", { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["gcal-status"] });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return null;

  // Sem credenciais do Google no ambiente não há o que conectar. Dizer isso é
  // melhor que oferecer um botão que sempre falha.
  if (status && !status.configured) {
    return (
      <p className="text-fg-muted text-[length:var(--text-small-size)]">
        Indisponível neste ambiente
      </p>
    );
  }

  const connected = status?.connected ?? false;
  const expired = status?.status === "expired";

  return (
    <div className="flex flex-col gap-2">
      {connected ? (
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          {expired
            ? "Conexão expirada — reconecte para retomar"
            : status?.email
              ? `Conectado como ${status.email}`
              : "Conectado"}
        </p>
      ) : null}

      {connected && !expired ? (
        <Button
          variant="secondary"
          size="sm"
          isLoading={busy}
          onClick={disconnect}
        >
          Desconectar
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          // Fluxo OAuth: navegação de página inteira para o route handler
          // que redireciona ao Google. router.push não serve aqui.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          onClick={() => window.location.assign("/api/gcal/connect")}
        >
          {expired ? "Reconectar" : "Conectar"}
        </Button>
      )}
    </div>
  );
}
