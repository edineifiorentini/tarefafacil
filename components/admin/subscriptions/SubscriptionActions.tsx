"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { Dialog, DropdownMenu } from "radix-ui";
import { IconDots } from "@tabler/icons-react";

import { useToast } from "@/components/ui/Toast";
import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import type { EstadoDaAssinatura } from "@/lib/admin/subscriptions";

type Acao = "cancelar" | "agendar_cancelamento" | "reativar";

const DEFINICAO: Record<
  Acao,
  { label: string; titulo: string; consequencia: string; destrutiva: boolean }
> = {
  agendar_cancelamento: {
    label: "Agendar cancelamento",
    titulo: "Agendar o cancelamento",
    consequencia:
      "A assinatura continua valendo até a data escolhida e termina nela. Dá para desfazer reativando antes.",
    destrutiva: false,
  },
  cancelar: {
    label: "Cancelar agora",
    titulo: "Cancelar a assinatura imediatamente",
    consequencia:
      "A assinatura encerra agora, sem esperar o fim do período pago. O acesso da empresa não muda por esta ação — para tirar do ar, suspenda a empresa.",
    destrutiva: true,
  },
  reativar: {
    label: "Reativar",
    titulo: "Reativar a assinatura",
    consequencia:
      "A assinatura volta a ativa e qualquer cancelamento agendado é removido.",
    destrutiva: false,
  },
};

/**
 * Ações da assinatura (especificação 11.4).
 *
 * O menu sai do estado: quem já está cancelada só reativa, quem tem
 * cancelamento agendado pode reativar (que desfaz) ou cancelar de vez.
 *
 * Falta aqui, e não é esquecimento: nova tentativa de cobrança, reenvio de
 * link de pagamento e reembolso. Todas dependem de um fluxo de cobrança que
 * este projeto ainda não roda — nada gera `subscription_charge`.
 */
export function SubscriptionActions({
  workspaceId,
  empresa,
  estado,
}: {
  workspaceId: string;
  empresa: string;
  estado: EstadoDaAssinatura;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [aberta, setAberta] = useState<Acao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [data, setData] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (estado === "sem_assinatura" || estado === "teste") {
    return (
      <span className="text-fg-muted text-[length:var(--text-caption-size)]">
        —
      </span>
    );
  }

  const disponiveis: Acao[] =
    estado === "cancelada"
      ? ["reativar"]
      : estado === "cancelamento_agendado"
        ? ["reativar", "cancelar"]
        : ["agendar_cancelamento", "cancelar"];

  function fechar() {
    setAberta(null);
    setMotivo("");
    setData("");
    setErro(null);
  }

  async function confirmar() {
    if (!aberta) return;
    const limpo = motivo.trim();
    if (limpo.length < MOTIVO_MINIMO) {
      setErro(
        limpo.length === 0
          ? "Escreva o motivo desta ação"
          : `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`
      );
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/subscriptions/${workspaceId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: aberta, motivo: limpo, data }),
      });
      const corpo = (await res.json()) as { message?: string };
      if (!res.ok) {
        setErro(corpo.message ?? "Não foi possível concluir. Tente de novo.");
        return;
      }
      show({ message: `${DEFINICAO[aberta].label} concluída` });
      fechar();
      router.refresh();
    } catch {
      setErro("Sem resposta do servidor. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const definicao = aberta ? DEFINICAO[aberta] : null;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={`Ações da assinatura de ${empresa}`}
          className="text-fg-muted hover:bg-hover hover:text-fg rounded-sm p-1.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <IconDots size={18} stroke={1.75} aria-hidden />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="tf-glass-strong border-line z-50 min-w-48 rounded-md border p-1 shadow-[var(--shadow-glass)]"
          >
            {disponiveis.map((a) => (
              <DropdownMenu.Item
                key={a}
                onSelect={() => setAberta(a)}
                className={`data-[highlighted]:bg-hover flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none ${
                  DEFINICAO[a].destrutiva ? "text-[var(--negative)]" : "text-fg"
                }`}
              >
                {DEFINICAO[a].label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={!!aberta} onOpenChange={(o) => !o && fechar()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 outline-none data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                {definicao?.titulo}
              </Dialog.Title>
              <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
                {empresa} — {definicao?.consequencia}
              </Dialog.Description>
            </div>

            {aberta === "agendar_cancelamento" ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cancelar-em"
                  className="text-fg text-[length:var(--text-small-size)] font-medium"
                >
                  Cancelar em
                </label>
                <input
                  id="cancelar-em"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="border-line bg-card text-fg w-48 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="assinatura-motivo"
                className="text-fg text-[length:var(--text-small-size)] font-medium"
              >
                Motivo
              </label>
              <textarea
                id="assinatura-motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por que esta ação está sendo feita"
                className="border-line bg-card text-fg placeholder:text-fg-muted rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              />
              <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                Fica na auditoria com o seu nome e a data.
              </p>
            </div>

            {erro ? (
              <p
                role="alert"
                className="text-[length:var(--text-small-size)] text-[var(--negative)]"
              >
                {erro}
              </p>
            ) : null}

            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close className="border-line hover:bg-hover text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={() => void confirmar()}
                disabled={enviando}
                className={`rounded-md px-3 py-2 text-[length:var(--text-small-size)] font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-60 ${
                  definicao?.destrutiva
                    ? "bg-[var(--button-danger-bg)] text-[var(--button-danger-fg)]"
                    : "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)]"
                }`}
              >
                {enviando ? "Salvando…" : definicao?.label}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
