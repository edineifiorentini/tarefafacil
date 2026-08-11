"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { useGcalStatus } from "@/lib/queries/useGcal";

// Banner persistente quando o token do Google expirou (design 9.7).
export function GcalReconnectBanner() {
  const { data } = useGcalStatus();
  if (data?.status !== "expired") return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-line bg-sunken px-4 py-2"
    >
      <span className="flex items-center gap-2 text-[length:var(--text-small-size)] text-fg">
        <IconAlertTriangle
          size={16}
          stroke={1.5}
          className="shrink-0 text-overdue"
          aria-hidden
        />
        Reconecte o Google Agenda para retomar a sincronização
      </span>
      <Button
        variant="secondary"
        size="sm"
        // Fluxo OAuth: navegação de página inteira ao route handler.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        onClick={() => window.location.assign("/api/gcal/connect")}
      >
        Reconectar
      </Button>
    </div>
  );
}
