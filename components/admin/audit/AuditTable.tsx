"use client";

import { useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Dialog } from "radix-ui";

import { StatusChip } from "@/components/ui/StatusChip";
import type { EventoAuditoria } from "@/lib/admin/audit";

/**
 * Trilha de auditoria, com gaveta de detalhe (especificação 15.3 e 20).
 *
 * A tabela mostra o que se lê de relance; o antes/depois vai na gaveta,
 * porque JSON aberto em célula destrói o ritmo da lista.
 *
 * A auditoria é somente leitura por construção: `audit_log` não tem política
 * de insert, update nem delete para o cliente, e aqui não existe nenhuma
 * ação. Não é uma tela que esqueceu o botão de editar.
 */

const TOM_DA_ACAO: Record<string, string> = {
  criou: "var(--positive)",
  alterou: "var(--chart-2)",
  excluiu: "var(--negative)",
};

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditTable({
  eventos,
  pagina,
  temMais,
}: {
  eventos: EventoAuditoria[];
  pagina: number;
  temMais: boolean;
}) {
  const params = useSearchParams();
  const [aberto, setAberto] = useState<EventoAuditoria | null>(null);

  function paginaHref(p: number): string {
    const novo = new URLSearchParams(params.toString());
    if (p <= 0) novo.delete("p");
    else novo.set("p", String(p));
    const qs = novo.toString();
    return qs ? `/admin/auditoria?${qs}` : "/admin/auditoria";
  }

  return (
    <>
      <div className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse">
            <caption className="sr-only">
              Eventos administrativos, do mais recente ao mais antigo
            </caption>
            <thead>
              <tr className="border-line border-b">
                {["Quando", "Autor", "Ação", "Escopo", "Resumo", ""].map(
                  (h, i) => (
                    <th
                      key={h || `acoes-${i}`}
                      scope="col"
                      className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium tracking-wide"
                    >
                      {h || <span className="sr-only">Detalhes</span>}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr
                  key={e.id}
                  className="border-line hover:bg-hover border-b last:border-0"
                >
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)] whitespace-nowrap">
                    {dataHora(e.quando)}
                  </td>
                  <td className="text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                    {e.autor}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={e.acao}
                      tone={TOM_DA_ACAO[e.acao] ?? "var(--text-muted)"}
                    />
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {e.empresa ?? "Plataforma"}
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {e.resumo}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setAberto(e)}
                      className="text-fg-link rounded-sm text-[length:var(--text-small-size)] outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      Detalhes
                      <span className="sr-only">
                        {" "}
                        do evento de {dataHora(e.quando)}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagina > 0 || temMais ? (
        <nav
          aria-label="Paginação"
          className="flex items-center justify-between gap-3"
        >
          {pagina > 0 ? (
            <Link
              href={paginaHref(pagina - 1)}
              className="border-line hover:bg-hover text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-fg-muted text-[length:var(--text-caption-size)]">
            Página {pagina + 1}
          </span>
          {temMais ? (
            <Link
              href={paginaHref(pagina + 1)}
              className="border-line hover:bg-hover text-fg-secondary rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <Dialog.Root open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
          <Dialog.Content className="tf-glass-strong border-line fixed inset-y-0 right-0 z-50 flex w-[min(28rem,100vw)] flex-col gap-4 overflow-y-auto border-l p-6 outline-none data-[state=open]:[animation:tf-slide-in-right_var(--dur-slow)_var(--ease-out)]">
            <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
              Detalhes do evento
            </Dialog.Title>
            <Dialog.Description className="text-fg-secondary text-[length:var(--text-small-size)]">
              {aberto?.resumo}
            </Dialog.Description>

            {aberto ? (
              <dl className="flex flex-col gap-3">
                {[
                  ["Quando", dataHora(aberto.quando)],
                  ["Autor", aberto.autor],
                  ["Ação", aberto.acao],
                  ["Escopo", aberto.empresa ?? "Plataforma"],
                  ["Entidade", aberto.entidade],
                  ["ID da entidade", aberto.entidadeId ?? "—"],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex flex-col gap-0.5">
                    <dt className="text-fg-muted text-[length:var(--text-caption-size)]">
                      {rotulo}
                    </dt>
                    <dd className="text-fg text-[length:var(--text-small-size)] break-words">
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {aberto?.detalhes ? (
              <div className="flex flex-col gap-1">
                <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                  Antes e depois
                </p>
                <pre className="bg-sunken text-fg-secondary overflow-x-auto rounded-sm p-3 text-[length:var(--text-caption-size)]">
                  {JSON.stringify(aberto.detalhes, null, 2)}
                </pre>
              </div>
            ) : null}

            <Dialog.Close className="border-line hover:bg-hover text-fg-secondary mt-auto rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
              Fechar
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
