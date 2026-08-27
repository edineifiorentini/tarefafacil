"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DropdownMenu } from "radix-ui";
import { IconDots } from "@tabler/icons-react";

import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";
import { MOTIVO_MINIMO } from "@/lib/admin/actions";
import { FATURA_TOM, type FaturaResumo } from "@/lib/admin/charges";
import { formatCentsBRL } from "@/lib/finance/money";

/**
 * Faturas emitidas, com as duas ações que fecham o ciclo sem provedor.
 *
 * "Registrar pagamento" é a peça que faz a cobrança manual funcionar de
 * verdade: o dinheiro entra por fora (Pix, transferência), você marca aqui,
 * e o acesso da empresa é empurrado até o fim do período mais a carência.
 */

type Acao = "registrar_pagamento" | "cancelar";

const DEFINICAO: Record<
  Acao,
  { label: string; titulo: string; consequencia: string; destrutiva: boolean }
> = {
  registrar_pagamento: {
    label: "Registrar pagamento",
    titulo: "Registrar o pagamento",
    consequencia:
      "A fatura é marcada como paga e o acesso da empresa é estendido até o fim do período mais a carência.",
    destrutiva: false,
  },
  cancelar: {
    label: "Cancelar fatura",
    titulo: "Cancelar a fatura",
    consequencia:
      "A fatura deixa de ser cobrável. Não devolve dinheiro e não mexe no acesso.",
    destrutiva: true,
  },
};

function data(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ChargesTable({ faturas }: { faturas: FaturaResumo[] }) {
  const router = useRouter();
  const { show } = useToast();

  const [alvo, setAlvo] = useState<{ fatura: FaturaResumo; acao: Acao } | null>(
    null
  );
  const [motivo, setMotivo] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function fechar() {
    setAlvo(null);
    setMotivo("");
    setValor("");
    setErro(null);
  }

  function abrir(fatura: FaturaResumo, acao: Acao) {
    setMotivo("");
    setErro(null);
    // Preenche com o valor cheio: o caso comum é receber o que foi cobrado,
    // e digitar o mesmo número de novo é trabalho sem ganho.
    setValor((fatura.valorCents / 100).toFixed(2));
    setAlvo({ fatura, acao });
  }

  async function confirmar() {
    if (!alvo) return;
    const limpo = motivo.trim();
    if (limpo.length < MOTIVO_MINIMO) {
      setErro(
        limpo.length === 0
          ? "Escreva o motivo desta ação"
          : `O motivo precisa de pelo menos ${MOTIVO_MINIMO} caracteres`
      );
      return;
    }

    const centavos =
      alvo.acao === "registrar_pagamento"
        ? Math.round(Number(valor.replace(",", ".")) * 100)
        : undefined;

    if (
      alvo.acao === "registrar_pagamento" &&
      (!Number.isFinite(centavos) || (centavos ?? 0) <= 0)
    ) {
      setErro("Informe o valor recebido");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/billing/charges/${alvo.fatura.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acao: alvo.acao,
          motivo: limpo,
          valorCents: centavos,
        }),
      });
      const corpo = (await res.json()) as {
        message?: string;
        acessoAte?: string;
      };
      if (!res.ok) {
        setErro(corpo.message ?? "Não foi possível concluir.");
        return;
      }
      show({
        message: corpo.acessoAte
          ? `Pagamento registrado. Acesso até ${data(corpo.acessoAte)}`
          : `${DEFINICAO[alvo.acao].label} concluída`,
      });
      fechar();
      router.refresh();
    } catch {
      setErro("Sem resposta do servidor. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (faturas.length === 0) {
    return (
      <p className="text-fg-muted px-1 text-[length:var(--text-small-size)]">
        Nenhuma fatura emitida ainda. Use &quot;Rodar cobrança&quot; para
        simular o mês e ver quem seria cobrado.
      </p>
    );
  }

  const definicao = alvo ? DEFINICAO[alvo.acao] : null;

  return (
    <>
      <div className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse">
            <caption className="sr-only">
              Faturas emitidas, da mais recente à mais antiga
            </caption>
            <thead>
              <tr className="border-line border-b">
                {[
                  "Empresa",
                  "Plano",
                  "Período",
                  "Valor",
                  "Situação",
                  "Vence",
                  "Paga em",
                  "",
                ].map((h, i) => (
                  <th
                    key={h || `acoes-${i}`}
                    scope="col"
                    className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium"
                  >
                    {h || <span className="sr-only">Ações</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faturas.map((f) => (
                <tr
                  key={f.id}
                  className="border-line hover:bg-hover border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/empresas/${f.workspaceId}`}
                      className="text-fg rounded-sm text-[length:var(--text-small-size)] font-medium outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      {f.empresa}
                    </Link>
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {f.planoNome}
                  </td>
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-caption-size)] whitespace-nowrap">
                    {data(f.periodoInicio)} → {data(f.periodoFim)}
                  </td>
                  <td className="tnum text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                    {formatCentsBRL(f.pagoCents ?? f.valorCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={f.situacao}
                      tone={FATURA_TOM[f.situacao] ?? "var(--text-muted)"}
                    />
                    {f.provedor === "manual" ? (
                      <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                        manual
                      </span>
                    ) : null}
                  </td>
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {data(f.vencimento)}
                  </td>
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {data(f.pagoEm)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.situacao === "paga" || f.situacao === "cancelada" ? (
                      <span className="text-fg-muted text-[length:var(--text-caption-size)]">
                        —
                      </span>
                    ) : (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                          aria-label={`Ações da fatura de ${f.empresa}`}
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
                            {(
                              ["registrar_pagamento", "cancelar"] as Acao[]
                            ).map((a) => (
                              <DropdownMenu.Item
                                key={a}
                                onSelect={() => abrir(f, a)}
                                className={`data-[highlighted]:bg-hover flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none ${
                                  DEFINICAO[a].destrutiva
                                    ? "text-[var(--negative)]"
                                    : "text-fg"
                                }`}
                              >
                                {DEFINICAO[a].label}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog.Root open={!!alvo} onOpenChange={(o) => !o && fechar()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed top-1/2 left-1/2 z-50 flex w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border p-6 outline-none">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
                {definicao?.titulo}
              </Dialog.Title>
              <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
                {alvo?.fatura.empresa} · {alvo?.fatura.planoNome} —{" "}
                {definicao?.consequencia}
              </Dialog.Description>
            </div>

            {alvo?.acao === "registrar_pagamento" ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="valor-recebido"
                  className="text-fg text-[length:var(--text-small-size)] font-medium"
                >
                  Valor recebido
                </label>
                <input
                  id="valor-recebido"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="border-line bg-card text-fg tnum w-40 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                />
                <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                  Cobrado: {formatCentsBRL(alvo.fatura.valorCents)}. Ajuste se
                  entrou valor diferente.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fatura-motivo"
                className="text-fg text-[length:var(--text-small-size)] font-medium"
              >
                Motivo
              </label>
              <textarea
                id="fatura-motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Pix recebido em 27/08, comprovante no e-mail"
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
