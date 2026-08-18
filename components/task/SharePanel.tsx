"use client";

import { IconCopy, IconLink, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  useCreateShareLink,
  useRevokeShareLink,
  useShareLinks,
} from "@/lib/queries/useShareLinks";
import type { ShareLink } from "@/types/database";

const PRAZOS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

function dataBR(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

function urlDo(token: string): string {
  return `${window.location.origin}/d/${token}`;
}

function situacao(link: ShareLink): "ativo" | "revogado" | "expirado" {
  if (link.revoked_at) return "revogado";
  if (new Date(link.expires_at) <= new Date()) return "expirado";
  return "ativo";
}

/**
 * Compartilhar a demanda com quem não tem conta (spec §11).
 *
 * A página pública mostra título, situação, prazo, responsável e etapas —
 * nada de comentários, anexos, tempo ou valores. Isso é decidido no
 * servidor (`lib/share/publicTask.ts`), não aqui: máscara na interface não
 * é controle de acesso.
 */
export function SharePanel({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}) {
  const toast = useToast();
  const { data: links = [] } = useShareLinks(taskId);
  const criar = useCreateShareLink(workspaceId, taskId);
  const revogar = useRevokeShareLink(taskId);
  const [dias, setDias] = useState("30");

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(urlDo(token));
      toast.show({ message: "Link copiado" });
    } catch {
      toast.show({ message: "Não foi possível copiar — selecione e copie" });
    }
  }

  const ativos = links.filter((l) => situacao(l) === "ativo");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
          Acompanhamento externo
        </h3>
        <p className="text-fg-muted mt-1 text-[length:var(--text-caption-size)]">
          Quem receber vê título, situação, prazo, responsável e etapas.
          Comentários, anexos e valores não aparecem.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <Select
            options={PRAZOS}
            value={dias}
            onValueChange={setDias}
            aria-label="Validade do link"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={IconLink}
          isLoading={criar.isPending}
          onClick={() =>
            criar.mutate(
              { days: Number(dias) },
              {
                onSuccess: (link) => copiar(link.token),
                onError: () =>
                  toast.show({ message: "Não foi possível criar o link" }),
              }
            )
          }
        >
          Gerar link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Nenhum link gerado.
        </p>
      ) : (
        <ul className="divide-line divide-y">
          {links.map((l) => {
            const s = situacao(l);
            return (
              <li key={l.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[length:var(--text-caption-size)] ${
                      s === "ativo" ? "text-fg" : "text-fg-muted line-through"
                    }`}
                  >
                    /d/{l.token.slice(0, 12)}…
                  </p>
                  <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                    {s === "revogado"
                      ? "Revogado"
                      : s === "expirado"
                        ? `Expirou em ${dataBR(l.expires_at)}`
                        : `Vale até ${dataBR(l.expires_at)}`}
                    {" · "}
                    {l.view_count === 0
                      ? "não aberto"
                      : `${l.view_count} ${l.view_count === 1 ? "abertura" : "aberturas"}`}
                  </p>
                </div>

                {s === "ativo" ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Copiar link"
                      onClick={() => copiar(l.token)}
                    >
                      <IconCopy size={15} stroke={1.75} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Revogar link"
                      onClick={() => revogar.mutate(l.id)}
                    >
                      <IconTrash size={15} stroke={1.75} />
                    </Button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {ativos.length > 1 ? (
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          Há {ativos.length} links ativos. Cada um funciona sozinho — revogue
          os que não usa.
        </p>
      ) : null}
    </div>
  );
}
