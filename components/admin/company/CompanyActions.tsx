"use client";

import { useState } from "react";

import { DropdownMenu } from "radix-ui";
import { IconChevronDown } from "@tabler/icons-react";

import { ACOES, type AcaoDeEmpresa } from "@/lib/admin/actions";

import { SensitiveActionDialog } from "./SensitiveActionDialog";

/**
 * Menu de ações administrativas da empresa (especificação 9.7).
 *
 * A lista é montada a partir do ESTADO da empresa: suspender não aparece
 * para quem já está suspensa, restaurar só aparece para quem foi excluída.
 * Botão que não faz nada no contexto atual ensina a pessoa a clicar e ver o
 * que acontece.
 *
 * A remoção definitiva não está aqui de propósito. Ela vive na rota, exige
 * 30 dias de quarentena e não é uma ação de rotina — a especificação (8.7)
 * pede que exclusão definitiva não seja ação primária.
 */

type Plano = { id: string; name: string; max_users: number };

export function CompanyActions({
  empresaId,
  empresaNome,
  suspensa,
  excluida,
  emTeste,
  planoId,
  assentos,
  planos,
}: {
  empresaId: string;
  empresaNome: string;
  suspensa: boolean;
  excluida: boolean;
  emTeste: boolean;
  planoId: string | null;
  assentos: number;
  planos: Plano[];
}) {
  const [aberta, setAberta] = useState<AcaoDeEmpresa | null>(null);

  // Carga de cada ação com campo próprio.
  const [novoPlano, setNovoPlano] = useState(planoId ?? "");
  const [novosAssentos, setNovosAssentos] = useState(String(assentos));
  const [dias, setDias] = useState("30");
  const [nota, setNota] = useState("");

  const disponiveis: AcaoDeEmpresa[] = excluida
    ? ["restaurar", "anotar"]
    : [
        "alterar_plano",
        "alterar_assentos",
        "conceder_acesso",
        ...(emTeste ? (["encerrar_teste"] as AcaoDeEmpresa[]) : []),
        suspensa ? "reativar" : "suspender",
        "anotar",
        "excluir",
      ];

  function valorDe(acao: AcaoDeEmpresa): string | number | null {
    if (acao === "alterar_plano") return novoPlano || null;
    if (acao === "alterar_assentos") return Number(novosAssentos);
    if (acao === "conceder_acesso") return Number(dias);
    if (acao === "anotar") return nota;
    return null;
  }

  function campoDe(acao: AcaoDeEmpresa) {
    if (acao === "alterar_plano") {
      return (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="acao-plano"
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            Plano novo
          </label>
          <select
            id="acao-plano"
            value={novoPlano}
            onChange={(e) => setNovoPlano(e.target.value)}
            className="border-line bg-card text-fg rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <option value="">Sem plano</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.max_users} assentos
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (acao === "alterar_assentos") {
      return (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="acao-assentos"
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            Assentos
          </label>
          <input
            id="acao-assentos"
            type="number"
            min={1}
            value={novosAssentos}
            onChange={(e) => setNovosAssentos(e.target.value)}
            className="border-line bg-card text-fg tnum w-32 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          />
        </div>
      );
    }

    if (acao === "conceder_acesso") {
      return (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="acao-dias"
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            Dias a conceder
          </label>
          <input
            id="acao-dias"
            type="number"
            min={1}
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            className="border-line bg-card text-fg tnum w-32 rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          />
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Somados ao vencimento atual quando ele ainda não passou.
          </p>
        </div>
      );
    }

    if (acao === "anotar") {
      return (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="acao-nota"
            className="text-fg text-[length:var(--text-small-size)] font-medium"
          >
            Observação
          </label>
          <textarea
            id="acao-nota"
            rows={4}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="O que a plataforma precisa lembrar sobre esta empresa"
            className="border-line bg-card text-fg placeholder:text-fg-muted rounded-md border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          />
        </div>
      );
    }

    return null;
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex items-center gap-1.5 rounded-md bg-[var(--button-primary-bg)] px-3 py-2 text-[length:var(--text-small-size)] font-medium text-[var(--button-primary-fg)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
          Ações
          <IconChevronDown size={16} stroke={2} aria-hidden />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="tf-glass-strong border-line z-50 min-w-52 rounded-md border p-1 shadow-[var(--shadow-glass)]"
          >
            {disponiveis.map((a) => (
              <DropdownMenu.Item
                key={a}
                onSelect={() => setAberta(a)}
                className={`data-[highlighted]:bg-hover flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none ${
                  ACOES[a].destrutiva ? "text-[var(--negative)]" : "text-fg"
                }`}
              >
                {ACOES[a].label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {aberta ? (
        <SensitiveActionDialog
          acao={aberta}
          empresaId={empresaId}
          empresaNome={empresaNome}
          aberto
          onFechar={() => setAberta(null)}
          campo={campoDe(aberta)}
          valor={valorDe(aberta)}
        />
      ) : null}
    </>
  );
}
