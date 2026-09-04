"use client";

import { IconBrandGoogleDrive, IconAlertTriangle } from "@tabler/icons-react";

import { useStorageUsage } from "@/lib/queries/useAttachments";
import {
  DIAS_APOS_APROVACAO,
  DIAS_SEM_DECISAO,
  formatarEspaco,
} from "@/lib/storage/quota";

/**
 * Quanto espaço a empresa já usou no servidor (0086).
 *
 * **A barra só aparece quando começa a importar.** Uma empresa em 3% não
 * precisa de um medidor ocupando espaço na tela toda vez que ela anexa um
 * arquivo — ela precisa dele quando está perto de bater, e aí precisa junto
 * a saída, que é o Google Drive.
 *
 * O texto sobre o Drive não promete integração: hoje "usar o Drive" é colar
 * o link no campo logo abaixo, e link não ocupa byte nenhum aqui. Quando a
 * subida direta para o Drive existir, esta frase muda — mas ela já é
 * verdade agora.
 */
export function StorageMeter({ workspaceId }: { workspaceId: string }) {
  const { data } = useStorageUsage(workspaceId);
  if (!data) return null;
  if (!data.perto && !data.cheio) return null;

  const pct = Math.min(100, Math.round(data.fracao * 100));

  return (
    <div
      role="status"
      className="border-line bg-sunken flex flex-col gap-2 rounded-md border px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <IconAlertTriangle
          size={15}
          stroke={1.75}
          aria-hidden
          className={data.cheio ? "text-overdue" : "text-fg-muted"}
        />
        <span className="text-fg text-[length:var(--text-small-size)] font-medium">
          {data.cheio
            ? "Espaço do servidor esgotado"
            : `Espaço quase no limite — ${pct}% usado`}
        </span>
      </div>

      <div
        className="bg-line h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Espaço usado no servidor"
      >
        <div
          className={`h-full rounded-full ${data.cheio ? "bg-overdue" : "bg-fg-muted"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        {formatarEspaco(data.usado)} de {formatarEspaco(data.cota)}.{" "}
        <span className="inline-flex items-center gap-1">
          <IconBrandGoogleDrive size={13} stroke={1.75} aria-hidden />
          Arquivo no Google Drive não ocupa espaço aqui — cole o link abaixo em
          vez de enviar.
        </span>
      </p>

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Material de aprovação sai do servidor {DIAS_APOS_APROVACAO} dias após
        ser aprovado, ou em {DIAS_SEM_DECISAO} dias se ninguém responder. Anexo
        interno e link do Drive não têm prazo.
      </p>
    </div>
  );
}
