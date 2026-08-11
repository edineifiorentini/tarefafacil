"use client";

import { IconCalendar, IconCheck } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGcalStatus } from "@/lib/queries/useGcal";

export function GcalConnectCard() {
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

  if (isLoading) {
    return <Skeleton variant="block" className="h-24" />;
  }

  if (status && !status.configured) {
    return (
      <div className="rounded-md border border-line bg-card p-4">
        <p className="text-fg-secondary">
          A integração com o Google Agenda ainda não está configurada neste
          ambiente.
        </p>
      </div>
    );
  }

  const connected = status?.connected ?? false;
  const expired = status?.status === "expired";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <IconCalendar
          size={20}
          stroke={1.5}
          className="mt-0.5 shrink-0 text-fg-muted"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-fg">Google Agenda</span>
          {connected ? (
            <span className="flex items-center gap-1 text-[length:var(--text-small-size)] text-fg-secondary">
              {!expired ? (
                <IconCheck size={14} stroke={1.5} className="text-fg-muted" />
              ) : null}
              {expired
                ? "Conexão expirada — reconecte para retomar"
                : `Conectado${status?.email ? ` como ${status.email}` : ""}`}
            </span>
          ) : (
            <span className="text-[length:var(--text-small-size)] text-fg-secondary">
              Sincronize tarefas com a sua agenda, uma a uma
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
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
    </div>
  );
}
