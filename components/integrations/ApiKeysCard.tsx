"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconCopy, IconKey } from "@tabler/icons-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { tempoRelativo } from "@/lib/utils/relative-time";

/**
 * Chaves de API da empresa (roadmap §23).
 *
 * A regra que define esta tela: **o valor aparece uma vez e some**. Não há
 * rota que o recupere, porque ele não existe em lugar nenhum — o banco tem
 * só o SHA-256. Por isso o diálogo de "chave criada" não fecha sozinho e não
 * some num aviso de três segundos: se sumir antes de a pessoa copiar, a
 * única saída é revogar e criar outra.
 *
 * Só o dono vê e usa. O servidor decide isso de novo — esconder o cartão
 * nunca foi controle.
 */

type Chave = {
  id: string;
  nome: string;
  prefixo: string;
  criadaEm: string;
  ultimoUso: string | null;
  revogadaEm: string | null;
};

export function ApiKeysCard() {
  const workspace = useWorkspace();
  const qc = useQueryClient();
  const { show } = useToast();

  const [nome, setNome] = useState("");
  const [criada, setCriada] = useState<{ valor: string; nome: string } | null>(
    null
  );
  const [copiada, setCopiada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const chave = ["api-keys", workspace.id] as const;

  const { data, isLoading, isError } = useQuery({
    queryKey: chave,
    queryFn: async (): Promise<Chave[] | null> => {
      const res = await fetch(
        `/api/workspace/api-keys?workspace=${workspace.id}`
      );
      // 403 não é erro de carregamento: é "você não é o dono". A tela some
      // em vez de mostrar uma falha que a pessoa não pode resolver.
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("falha");
      const json = (await res.json()) as { chaves: Chave[] };
      return json.chaves;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/workspace/api-keys?workspace=${workspace.id}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nome }),
        }
      );
      const corpo = (await res.json()) as { message?: string; valor?: string };
      if (!res.ok) throw new Error(corpo.message ?? "Não foi possível criar");
      return corpo.valor as string;
    },
    onSuccess: (valor) => {
      setCriada({ valor, nome });
      setNome("");
      setErro(null);
      void qc.invalidateQueries({ queryKey: chave });
    },
    onError: (e) => setErro(e instanceof Error ? e.message : "Falhou"),
  });

  const revogar = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/workspace/api-keys/${id}?workspace=${workspace.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("falha");
    },
    onSuccess: () => {
      show({ message: "Chave revogada" });
      void qc.invalidateQueries({ queryKey: chave });
    },
    onError: () => show({ message: "Não foi possível revogar" }),
  });

  async function copiar() {
    if (!criada) return;
    try {
      await navigator.clipboard.writeText(criada.valor);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 1600);
    } catch {
      // O valor está visível no campo para seleção manual.
    }
  }

  if (isLoading) return <Skeleton variant="block" className="h-40" />;
  // Não é dono, ou a leitura falhou: o cartão não aparece.
  if (isError || data === null || data === undefined) return null;

  const ativas = data.filter((k) => !k.revogadaEm);
  const revogadas = data.filter((k) => k.revogadaEm);

  return (
    <section className="border-line bg-card flex flex-col gap-4 rounded-md border p-[var(--space-card-pad)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="bg-sunken text-fg-muted flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <IconKey size={20} stroke={1.75} />
        </span>
        <div>
          <h3 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            Chaves de API
          </h3>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Para o seu sistema conversar com o TAFLOW. Quem tem a chave age
            em nome da empresa — trate como senha.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) criar.mutate();
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="text-fg-secondary flex flex-col gap-1 text-[length:var(--text-caption-size)]">
          Nome da chave
          <div className="w-64">
            <TextInput
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: integração do site"
              aria-label="Nome da chave"
            />
          </div>
        </label>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          isLoading={criar.isPending}
        >
          Gerar chave
        </Button>
      </form>

      {erro ? (
        <p
          role="alert"
          className="text-[length:var(--text-small-size)] text-[var(--negative)]"
        >
          {erro}
        </p>
      ) : null}

      {ativas.length === 0 ? (
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          Nenhuma chave ativa.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ativas.map((k) => (
            <li
              key={k.id}
              className="border-line flex flex-wrap items-center gap-3 rounded-sm border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-fg text-[length:var(--text-small-size)] font-medium">
                  {k.nome}
                </p>
                <p className="text-fg-muted font-mono text-[length:var(--text-caption-size)]">
                  {k.prefixo}
                  {"…"}
                </p>
              </div>
              <span className="text-fg-muted text-[length:var(--text-caption-size)]">
                {k.ultimoUso
                  ? `usada ${tempoRelativo(k.ultimoUso).toLowerCase()}`
                  : "nunca usada"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                isLoading={revogar.isPending}
                onClick={() => revogar.mutate(k.id)}
              >
                Revogar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {revogadas.length > 0 ? (
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          {revogadas.length} chave{revogadas.length === 1 ? "" : "s"} revogada
          {revogadas.length === 1 ? "" : "s"}. Elas ficam no histórico, sem
          valer mais.
        </p>
      ) : null}

      <Dialog.Root
        open={!!criada}
        onOpenChange={(o) => {
          if (!o) {
            setCriada(null);
            setCopiada(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 outline-none">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Chave criada
              </Dialog.Title>
              <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
                {criada?.nome} — copie agora. Esta é a única vez que ela
                aparece.
              </Dialog.Description>
            </div>

            <div className="flex gap-2">
              <input
                readOnly
                value={criada?.valor ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Valor da chave"
                className="border-line bg-card text-fg min-w-0 flex-1 rounded-md border px-3 py-2 font-mono text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              />
              <button
                type="button"
                onClick={() => void copiar()}
                className="border-line hover:bg-hover text-fg-secondary flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                {copiada ? (
                  <IconCheck size={16} stroke={2} aria-hidden />
                ) : (
                  <IconCopy size={16} stroke={1.75} aria-hidden />
                )}
                {copiada ? "Copiado" : "Copiar"}
              </button>
            </div>

            <p className="text-[length:var(--text-caption-size)] text-[var(--negative)]">
              Não existe como recuperar depois: o sistema guarda só um resumo
              criptográfico dela. Se perder, revogue e gere outra.
            </p>

            <div className="mt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCriada(null);
                  setCopiada(false);
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
