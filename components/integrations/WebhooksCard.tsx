"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconCopy, IconWebhook } from "@tabler/icons-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import {
  CABECALHO_ASSINATURA,
  CABECALHO_TIMESTAMP,
  EVENTOS,
  EVENTO_DESCRICAO,
  type Evento,
} from "@/lib/webhooks/events";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { tempoRelativo } from "@/lib/utils/relative-time";

/**
 * Destinos de webhook (roadmap §23).
 *
 * Duas coisas definem esta tela:
 *
 * 1. **O segredo aparece uma vez.** Igual à chave de API: o diálogo não fecha
 *    sozinho, e quem perder precisa rotacionar.
 * 2. **O registro de entregas fica junto.** É a primeira pergunta quando algo
 *    "não chegou", e mandar a pessoa abrir outra tela para descobrir que o
 *    sistema dela devolveu 500 é o que transforma dúvida em chamado.
 */

type Inscricao = {
  id: string;
  url: string;
  eventos: Evento[];
  ativo: boolean;
  falhasSeguidas: number;
  desativadoEm: string | null;
  criadaEm: string;
};

type Entrega = {
  id: string;
  evento: string;
  status: string;
  tentativas: number;
  ultimoStatusHttp: number | null;
  ultimoErro: string | null;
  entregueEm: string | null;
  criadaEm: string;
};

const TOM: Record<string, string> = {
  entregue: "var(--positive)",
  pendente: "var(--status-due-soon-fg)",
  falhou: "var(--negative)",
  desistiu: "var(--text-muted)",
};

export function WebhooksCard() {
  const workspace = useWorkspace();
  const qc = useQueryClient();
  const { show } = useToast();

  const [url, setUrl] = useState("");
  const [escolhidos, setEscolhidos] = useState<Evento[]>([]);
  const [segredo, setSegredo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const chave = ["webhooks", workspace.id] as const;

  const { data, isLoading, isError } = useQuery({
    queryKey: chave,
    queryFn: async (): Promise<{
      inscricoes: Inscricao[];
      entregas: Entrega[];
    } | null> => {
      const res = await fetch(
        `/api/workspace/webhooks?workspace=${workspace.id}`
      );
      // 403 é "você não é o dono", não falha: o cartão some.
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("falha");
      return (await res.json()) as {
        inscricoes: Inscricao[];
        entregas: Entrega[];
      };
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/workspace/webhooks?workspace=${workspace.id}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, eventos: escolhidos }),
        }
      );
      const corpo = (await res.json()) as {
        message?: string;
        segredo?: string;
      };
      if (!res.ok) throw new Error(corpo.message ?? "Não foi possível criar");
      return corpo.segredo as string;
    },
    onSuccess: (s) => {
      setSegredo(s);
      setUrl("");
      setEscolhidos([]);
      setErro(null);
      void qc.invalidateQueries({ queryKey: chave });
    },
    onError: (e) => setErro(e instanceof Error ? e.message : "Falhou"),
  });

  const acao = useMutation({
    mutationFn: async (p: {
      id: string;
      acao: "rotacionar" | "ativo";
      ativo?: boolean;
    }) => {
      const res = await fetch(
        `/api/workspace/webhooks/${p.id}?workspace=${workspace.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ acao: p.acao, ativo: p.ativo }),
        }
      );
      const corpo = (await res.json()) as { segredo?: string };
      if (!res.ok) throw new Error("falha");
      return corpo.segredo ?? null;
    },
    onSuccess: (novo) => {
      if (novo) setSegredo(novo);
      else show({ message: "Destino atualizado" });
      void qc.invalidateQueries({ queryKey: chave });
    },
    onError: () => show({ message: "Não foi possível concluir" }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/workspace/webhooks/${id}?workspace=${workspace.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      show({ message: "Destino removido" });
      void qc.invalidateQueries({ queryKey: chave });
    },
    onError: () => show({ message: "Não foi possível remover" }),
  });

  async function copiar() {
    if (!segredo) return;
    try {
      await navigator.clipboard.writeText(segredo);
      setCopiada();
    } catch {
      // Visível no campo para seleção manual.
    }
  }

  function setCopiada() {
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  function alternar(e: Evento) {
    setEscolhidos((atual) =>
      atual.includes(e) ? atual.filter((x) => x !== e) : [...atual, e]
    );
  }

  if (isLoading) return <Skeleton variant="block" className="h-40" />;
  if (isError || !data) return null;

  return (
    <section className="border-line bg-card flex flex-col gap-4 rounded-md border p-[var(--space-card-pad)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-sunken text-fg-muted flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <IconWebhook size={20} stroke={1.75} />
        </span>
        <div>
          <h3 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            Webhooks
          </h3>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            O TAFLOW avisa o seu sistema quando algo acontece aqui. Só
            https, e o corpo vai assinado.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim() && escolhidos.length > 0) criar.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
          Endereço de destino
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seusistema.com/webhooks/taflow"
            aria-label="Endereço de destino"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-fg-secondary text-[length:var(--text-caption-size)]">
            Eventos
          </legend>
          <div className="flex flex-wrap gap-2">
            {EVENTOS.map((e) => {
              const marcado = escolhidos.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={marcado}
                  title={EVENTO_DESCRICAO[e]}
                  onClick={() => alternar(e)}
                  className={`rounded-xs px-2 py-1 font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
                    marcado
                      ? "bg-selected text-fg-link"
                      : "border-line text-fg-secondary hover:bg-hover border"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={criar.isPending}
          >
            Cadastrar destino
          </Button>
        </div>
      </form>

      {erro ? (
        <p
          role="alert"
          className="text-[length:var(--text-small-size)] text-[var(--negative)]"
        >
          {erro}
        </p>
      ) : null}

      {data.inscricoes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {data.inscricoes.map((i) => (
            <li
              key={i.id}
              className="border-line flex flex-wrap items-center gap-3 rounded-sm border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-fg truncate text-[length:var(--text-small-size)] font-medium">
                  {i.url}
                </p>
                <p className="text-fg-muted font-mono text-[length:var(--text-caption-size)]">
                  {i.eventos.join(", ")}
                </p>
              </div>
              <StatusChip
                label={i.ativo ? "Ativo" : "Pausado"}
                tone={i.ativo ? "var(--positive)" : "var(--text-muted)"}
              />
              {!i.ativo && i.desativadoEm ? (
                <span className="text-fg-muted text-[length:var(--text-caption-size)]">
                  desligado por falhar demais
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  acao.mutate({ id: i.id, acao: "ativo", ativo: !i.ativo })
                }
              >
                {i.ativo ? "Pausar" : "Reativar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => acao.mutate({ id: i.id, acao: "rotacionar" })}
              >
                Trocar segredo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                isLoading={remover.isPending}
                onClick={() => remover.mutate(i.id)}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          Nenhum destino cadastrado.
        </p>
      )}

      {data.entregas.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-fg text-[length:var(--text-small-size)] font-medium">
            Últimas entregas
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse">
              <thead>
                <tr className="border-line border-b">
                  {[
                    "Evento",
                    "Situação",
                    "Tentativas",
                    "Resposta",
                    "Quando",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="text-fg-muted px-2 py-1.5 text-left text-[length:var(--text-caption-size)] font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.entregas.map((d) => (
                  <tr key={d.id} className="border-line border-b last:border-0">
                    <td className="text-fg-secondary px-2 py-1.5 font-mono text-[length:var(--text-caption-size)]">
                      {d.evento}
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusChip
                        label={d.status}
                        tone={TOM[d.status] ?? "var(--text-muted)"}
                      />
                    </td>
                    <td className="tnum text-fg-secondary px-2 py-1.5 text-[length:var(--text-caption-size)]">
                      {d.tentativas}
                    </td>
                    <td className="text-fg-secondary max-w-[16rem] truncate px-2 py-1.5 text-[length:var(--text-caption-size)]">
                      {d.ultimoErro ?? d.ultimoStatusHttp ?? "—"}
                    </td>
                    <td className="text-fg-secondary px-2 py-1.5 text-[length:var(--text-caption-size)]">
                      {tempoRelativo(d.entregueEm ?? d.criadaEm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Dialog.Root
        open={!!segredo}
        onOpenChange={(o) => {
          if (!o) {
            setSegredo(null);
            setCopiado(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 outline-none">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Segredo de assinatura
              </Dialog.Title>
              <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
                Copie agora. Esta é a única vez que ele aparece.
              </Dialog.Description>
            </div>

            <div className="flex gap-2">
              <input
                readOnly
                value={segredo ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Segredo de assinatura"
                className="border-line bg-card text-fg min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              />
              <button
                type="button"
                onClick={() => void copiar()}
                className="border-line hover:bg-hover text-fg-secondary flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                {copiado ? (
                  <IconCheck size={16} stroke={2} aria-hidden />
                ) : (
                  <IconCopy size={16} stroke={1.75} aria-hidden />
                )}
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>

            <div className="border-line bg-sunken text-fg-secondary rounded-sm border p-3 text-[length:var(--text-caption-size)]">
              <p className="mb-1">Como conferir no seu sistema:</p>
              <pre className="overflow-x-auto whitespace-pre-wrap">
                {`assinatura = HMAC_SHA256(segredo, timestamp + "." + corpo)

${CABECALHO_TIMESTAMP}: <segundos>
${CABECALHO_ASSINATURA}: <hex>`}
              </pre>
              <p className="mt-2">
                Recuse o que chegar com carimbo de mais de 5 minutos: é o que
                impede alguém de reenviar uma entrega capturada.
              </p>
            </div>

            <div className="mt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSegredo(null);
                  setCopiado(false);
                }}
              >
                Já copiei, fechar
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
