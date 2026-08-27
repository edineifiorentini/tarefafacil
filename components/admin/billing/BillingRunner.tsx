"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { IconPlayerPlay } from "@tabler/icons-react";

import { useToast } from "@/components/ui/Toast";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatCentsBRL } from "@/lib/finance/money";

/**
 * Executa a cobrança do mês (especificação 11.4).
 *
 * O fluxo é deliberadamente em DUAS etapas: simula, mostra linha por linha
 * quem seria cobrado e quanto, e só então oferece emitir. Botão único que
 * cobra na hora é como se descobre um erro de regra depois da fatura já
 * estar na mão do cliente.
 *
 * A emissão real pede a palavra COBRAR digitada. Confirmação por digitação é
 * cara demais para ação corriqueira, e barata para esta: acontece uma vez
 * por mês e emite dinheiro.
 */

type Linha = {
  workspaceId: string;
  empresa: string;
  planoNome: string | null;
  valorCents: number;
  ciclo: { start: string; end: string } | null;
  resultado: "simulado" | "criada" | "ja_existia" | "pulou" | "erro";
  motivo?: string;
};

type Resumo = {
  simulacao: boolean;
  provedor: string;
  avaliadas: number;
  aCobrar: number;
  criadas: number;
  jaExistiam: number;
  erros: number;
  totalCents: number;
  linhas: Linha[];
};

const TOM: Record<Linha["resultado"], string> = {
  simulado: "var(--chart-2)",
  criada: "var(--positive)",
  ja_existia: "var(--text-muted)",
  pulou: "var(--text-muted)",
  erro: "var(--negative)",
};

const ROTULO: Record<Linha["resultado"], string> = {
  simulado: "Cobraria",
  criada: "Fatura criada",
  ja_existia: "Já tinha fatura",
  pulou: "Não cobra",
  erro: "Erro",
};

export function BillingRunner() {
  const router = useRouter();
  const { show } = useToast();

  const [aberto, setAberto] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);

  async function rodar(simulacao: boolean) {
    setRodando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ simulacao, confirmacao }),
      });
      const corpo = (await res.json()) as Resumo & { message?: string };
      if (!res.ok) {
        setErro(corpo.message ?? "Não foi possível executar.");
        return;
      }
      setResumo(corpo);
      if (!simulacao) {
        show({ message: `${corpo.criadas} faturas emitidas` });
        router.refresh();
      }
    } catch {
      setErro("Sem resposta do servidor. Confira a conexão e tente de novo.");
    } finally {
      setRodando(false);
    }
  }

  function abrir() {
    setResumo(null);
    setConfirmacao("");
    setErro(null);
    setAberto(true);
    void rodar(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="flex items-center gap-1.5 rounded-md bg-[var(--button-primary-bg)] px-3 py-2 text-[length:var(--text-small-size)] font-medium text-[var(--button-primary-fg)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <IconPlayerPlay size={16} stroke={2} aria-hidden />
        Rodar cobrança
      </button>

      <Dialog.Root open={aberto} onOpenChange={setAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-md border p-6 outline-none">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                Cobrança do mês
              </Dialog.Title>
              <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
                {resumo?.simulacao === false
                  ? "Faturas emitidas."
                  : "Simulação — nada foi gravado. Confira linha por linha antes de emitir."}
              </Dialog.Description>
            </div>

            {rodando && !resumo ? (
              <p className="text-fg-secondary text-[length:var(--text-small-size)]">
                Calculando…
              </p>
            ) : null}

            {resumo ? (
              <>
                <dl className="border-line bg-subtle grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-4">
                  {[
                    ["Assinaturas avaliadas", String(resumo.avaliadas)],
                    [
                      resumo.simulacao ? "Cobraria" : "Faturas criadas",
                      String(
                        resumo.simulacao ? resumo.aCobrar : resumo.criadas
                      ),
                    ],
                    ["Total", formatCentsBRL(resumo.totalCents)],
                    ["Provedor", resumo.provedor],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex flex-col gap-0.5">
                      <dt className="text-fg-muted text-[length:var(--text-caption-size)]">
                        {rotulo}
                      </dt>
                      <dd className="tnum text-fg text-[length:var(--text-small-size)] font-medium">
                        {valor}
                      </dd>
                    </div>
                  ))}
                </dl>

                {resumo.erros > 0 ? (
                  <p
                    role="alert"
                    className="text-[length:var(--text-small-size)] text-[var(--negative)]"
                  >
                    {resumo.erros} empresa(s) falharam. As demais seguiram — os
                    detalhes estão na lista abaixo.
                  </p>
                ) : null}

                <div className="border-line overflow-hidden rounded-md border">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-line bg-subtle border-b">
                        {["Empresa", "Plano", "Período", "Valor", ""].map(
                          (h, i) => (
                            <th
                              key={h || `r-${i}`}
                              scope="col"
                              className="text-fg-muted px-3 py-2 text-left text-[length:var(--text-caption-size)] font-medium"
                            >
                              {h || <span className="sr-only">Resultado</span>}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.linhas.map((l) => (
                        <tr
                          key={l.workspaceId}
                          className="border-line border-b last:border-0"
                        >
                          <td className="text-fg px-3 py-2 text-[length:var(--text-small-size)]">
                            {l.empresa}
                          </td>
                          <td className="text-fg-secondary px-3 py-2 text-[length:var(--text-small-size)]">
                            {l.planoNome ?? "—"}
                          </td>
                          <td className="tnum text-fg-secondary px-3 py-2 text-[length:var(--text-caption-size)]">
                            {l.ciclo
                              ? `${l.ciclo.start} → ${l.ciclo.end}`
                              : "—"}
                          </td>
                          <td className="tnum text-fg px-3 py-2 text-[length:var(--text-small-size)]">
                            {l.valorCents > 0
                              ? formatCentsBRL(l.valorCents)
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusChip
                              label={ROTULO[l.resultado]}
                              tone={TOM[l.resultado]}
                            />
                            {l.motivo ? (
                              <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                                {l.motivo}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {resumo.simulacao && resumo.aCobrar > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="confirma-cobranca"
                      className="text-fg text-[length:var(--text-small-size)] font-medium"
                    >
                      Digite <span className="font-mono">COBRAR</span> para
                      emitir {resumo.aCobrar} fatura(s) no total de{" "}
                      {formatCentsBRL(resumo.totalCents)}
                    </label>
                    <input
                      id="confirma-cobranca"
                      value={confirmacao}
                      onChange={(e) => setConfirmacao(e.target.value)}
                      autoComplete="off"
                      className="border-line bg-card text-fg w-48 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    />
                  </div>
                ) : null}
              </>
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
                Fechar
              </Dialog.Close>
              {resumo?.simulacao && resumo.aCobrar > 0 ? (
                <button
                  type="button"
                  onClick={() => void rodar(false)}
                  disabled={rodando || confirmacao.trim() !== "COBRAR"}
                  className="rounded-md bg-[var(--button-danger-bg)] px-3 py-2 text-[length:var(--text-small-size)] font-medium text-[var(--button-danger-fg)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-60"
                >
                  {rodando ? "Emitindo…" : "Emitir faturas"}
                </button>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
