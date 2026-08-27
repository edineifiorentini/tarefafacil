"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { IconX } from "@tabler/icons-react";

import type { EscopoAuditoria } from "@/lib/admin/audit";
import type { AuditAction } from "@/types/database";

/**
 * Filtros da auditoria (especificação 15.3).
 *
 * Tudo vai para a URL: o painel é feito para ser mandado por link, e a página
 * continua sendo Server Component — quem filtra é o Postgres, não o
 * navegador com a lista inteira na memória.
 *
 * Filtro ativo vira chip removível (especificação 9.4).
 */

const ESCOPOS: { valor: EscopoAuditoria; label: string }[] = [
  { valor: "tudo", label: "Tudo" },
  { valor: "plataforma", label: "Plataforma" },
  { valor: "empresas", label: "Empresas" },
];

const ACOES: AuditAction[] = ["criou", "alterou", "excluiu"];

export function AuditFilters({
  escopo,
  acao,
  q,
}: {
  escopo: EscopoAuditoria;
  acao?: AuditAction;
  q: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function aplicar(chave: string, valor: string | null) {
    const novo = new URLSearchParams(params.toString());
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    // Trocar de filtro volta para a primeira página: manter a página 3 de um
    // recorte que agora tem 4 linhas mostraria uma lista vazia.
    novo.delete("p");
    router.push(`/admin/auditoria?${novo.toString()}`);
  }

  const chips: { chave: string; label: string }[] = [];
  if (escopo !== "tudo") {
    chips.push({
      chave: "escopo",
      label: ESCOPOS.find((e) => e.valor === escopo)?.label ?? escopo,
    });
  }
  if (acao) chips.push({ chave: "acao", label: acao });
  if (q) chips.push({ chave: "q", label: `"${q}"` });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Escopo"
          className="border-line bg-card flex items-center gap-1 rounded-md border p-1"
        >
          {ESCOPOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              role="radio"
              aria-checked={escopo === e.valor}
              tabIndex={escopo === e.valor ? 0 : -1}
              onClick={() =>
                aplicar("escopo", e.valor === "tudo" ? null : e.valor)
              }
              className={`rounded-sm px-3 py-1.5 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
                escopo === e.valor
                  ? "bg-selected text-fg-link font-medium"
                  : "text-fg-secondary hover:bg-hover"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        <label className="sr-only" htmlFor="filtro-acao">
          Ação
        </label>
        <select
          id="filtro-acao"
          value={acao ?? ""}
          onChange={(e) => aplicar("acao", e.target.value || null)}
          className="border-line bg-card text-fg rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <option value="">Qualquer ação</option>
          {ACOES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const campo = new FormData(e.currentTarget).get("q");
            aplicar("q", String(campo ?? "").trim() || null);
          }}
          className="min-w-0 flex-1"
        >
          <label className="sr-only" htmlFor="filtro-q">
            Buscar no resumo
          </label>
          <input
            id="filtro-q"
            name="q"
            defaultValue={q}
            placeholder="Buscar no resumo"
            className="border-line bg-card text-fg placeholder:text-fg-muted w-full rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          />
        </form>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.chave}
              type="button"
              onClick={() => aplicar(c.chave, null)}
              className="bg-selected text-fg-link hover:bg-hover flex items-center gap-1 rounded-xs px-2 py-1 text-[length:var(--text-caption-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              {c.label}
              <IconX size={13} stroke={2} aria-hidden />
              <span className="sr-only">Remover filtro</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push("/admin/auditoria")}
            className="text-fg-muted hover:text-fg rounded-sm text-[length:var(--text-caption-size)] underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            Limpar tudo
          </button>
        </div>
      ) : null}
    </div>
  );
}
