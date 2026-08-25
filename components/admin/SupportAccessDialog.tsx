"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

/**
 * Confirmação para entrar na conta de um cliente.
 *
 * O motivo é obrigatório e vai para a trilha DO CLIENTE, onde ele consegue
 * ler. Isso é de propósito: escrever "vou ver por que a cobrança dele não
 * gerou" sabendo que ele vai ler é o que mantém o acesso honesto. Um campo
 * que ninguém lê vira "teste" em duas semanas.
 *
 * O diálogo também é o último ponto em que dá para desistir — depois dele o
 * navegador troca de sessão e o admin sai da própria conta.
 */
const MOTIVO_MIN = 5;

export function SupportAccessDialog({
  workspaceId,
  workspaceName,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  workspaceName: string;
  /**
   * Controlado de fora porque quem abre é um item de menu, e o menu precisa
   * fechar junto. Com o gatilho aqui dentro, o menu suspenso ficava aberto
   * atrás do diálogo.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setEntrando(true);
    setErro(null);

    const res = await fetch("/api/admin/support/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, reason: motivo.trim() }),
    });

    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { error?: string };
      setEntrando(false);
      setErro(
        corpo.error === "sem_segredo"
          ? "Acesso de suporte desligado neste ambiente — falta SUPPORT_ACCESS_SECRET"
          : corpo.error === "owner_without_email"
            ? "Esta empresa não tem dono com e-mail para acessar"
            : "Não foi possível abrir o acesso agora"
      );
      return;
    }

    // Recarga completa e não router.push: a sessão trocou de pessoa nos
    // cookies, e a navegação do Next reaproveitaria o cache do inquilino
    // anterior — a tela abriria com dados de quem não está mais logado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/hoje");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)]" />
        <Dialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md p-5">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-medium">
              Acessar {workspaceName} como suporte
            </Dialog.Title>
            <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
              Você entra na conta com os poderes do dono, por uma hora. O
              cliente vê no histórico dele que você entrou, quando saiu e o
              motivo abaixo. Sua sessão atual é substituída — ao encerrar, você
              entra de novo com a sua conta.
            </Dialog.Description>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
              Motivo
            </span>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: verificar por que a cobrança de agosto não gerou"
              aria-label="Motivo do acesso"
            />
          </label>

          {erro ? (
            <p
              role="alert"
              className="text-overdue text-[length:var(--text-small-size)]"
            >
              {erro}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Cancelar
              </Button>
            </Dialog.Close>
            <Button
              variant="primary"
              size="sm"
              isLoading={entrando}
              disabled={motivo.trim().length < MOTIVO_MIN}
              onClick={entrar}
            >
              Entrar na conta
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
