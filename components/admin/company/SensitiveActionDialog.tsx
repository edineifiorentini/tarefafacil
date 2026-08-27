"use client";

import { useState, type ReactNode } from "react";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";

import { useToast } from "@/components/ui/Toast";
import { ACOES, validarMotivo, type AcaoDeEmpresa } from "@/lib/admin/actions";

/**
 * Confirmação de ação administrativa (especificação 9.7 e 20).
 *
 * O diálogo diz o que vai acontecer, a qual empresa, e se dá para voltar
 * atrás. O botão usa o verbo da ação — "Suspender conta", não "Confirmar":
 * quem lê rápido lê só o botão.
 *
 * O motivo é campo, não formalidade. A mesma função valida aqui e no
 * servidor; aqui é para a pessoa não perder o preenchimento numa viagem de
 * rede, lá é onde a regra vale de verdade.
 */
export function SensitiveActionDialog({
  acao,
  empresaId,
  empresaNome,
  aberto,
  onFechar,
  campo,
  valor,
}: {
  acao: AcaoDeEmpresa;
  empresaId: string;
  empresaNome: string;
  aberto: boolean;
  onFechar: () => void;
  /** Campo específico da ação (seletor de plano, número de assentos…). */
  campo?: ReactNode;
  /** Carga que vai para o servidor. */
  valor?: string | number | null;
}) {
  const definicao = ACOES[acao];
  const router = useRouter();
  const { show } = useToast();

  // Estado sempre limpo: quem chama monta este componente só enquanto a ação
  // está aberta e o desmonta ao fechar. Não existe caminho em que um motivo
  // escrito para "suspender" sobreviva até uma reativação.
  const [motivo, setMotivo] = useState("");
  const [nomeDigitado, setNomeDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const nomeConfere =
    !definicao.exigeNome || nomeDigitado.trim() === empresaNome;

  async function confirmar() {
    const problema = validarMotivo(acao, motivo);
    if (problema) {
      setErro(problema);
      return;
    }
    if (!nomeConfere) {
      setErro("O nome digitado não confere");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/companies/${empresaId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao, motivo, nomeDigitado, valor }),
      });
      const corpo = (await res.json()) as { message?: string };
      if (!res.ok) {
        // A mensagem do servidor é mais específica que qualquer texto
        // genérico que eu escrevesse aqui.
        setErro(corpo.message ?? "Não foi possível concluir. Tente de novo.");
        return;
      }
      show({ message: `${definicao.label} concluída` });
      onFechar();
      router.refresh();
    } catch {
      setErro("Sem resposta do servidor. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
        <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 outline-none data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
              {definicao.titulo}
            </Dialog.Title>
            <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
              {empresaNome} — {definicao.consequencia}
            </Dialog.Description>
          </div>

          {campo}

          {definicao.exigeMotivo ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="motivo-acao"
                className="text-fg text-[length:var(--text-small-size)] font-medium"
              >
                Motivo
              </label>
              <textarea
                id="motivo-acao"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Por que esta ação está sendo feita"
                className="border-line bg-card text-fg placeholder:text-fg-muted rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              />
              <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                Fica na auditoria com o seu nome e a data.
              </p>
            </div>
          ) : null}

          {definicao.exigeNome ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirma-nome"
                className="text-fg text-[length:var(--text-small-size)] font-medium"
              >
                Digite <span className="font-mono">{empresaNome}</span> para
                confirmar
              </label>
              <input
                id="confirma-nome"
                value={nomeDigitado}
                onChange={(e) => setNomeDigitado(e.target.value)}
                autoComplete="off"
                className="border-line bg-card text-fg rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              />
            </div>
          ) : null}

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
                definicao.destrutiva
                  ? "bg-[var(--button-danger-bg)] text-[var(--button-danger-fg)]"
                  : "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)]"
              }`}
            >
              {enviando ? "Salvando…" : definicao.label}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
