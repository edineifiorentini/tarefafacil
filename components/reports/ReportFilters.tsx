"use client";

import { useId, useState } from "react";

import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconLayoutGrid,
  IconUser,
} from "@tabler/icons-react";
import { DropdownMenu, Popover } from "radix-ui";

import { Button } from "@/components/ui/Button";

import { PERIODOS, type ChaveDePeriodo } from "@/lib/reports/periodo";
import { SEM_RESPONSAVEL } from "@/lib/reports/overview";

import type { FiltrosDoRelatorio } from "./useReportFilters";

/**
 * A barra que comanda a tela inteira.
 *
 * **Um conjunto de filtros para tudo.** Cartões, gráficos, ranking e tabela
 * leem daqui. A alternativa — cada bloco com o seu período — produz uma tela
 * onde dois números lado a lado respondem a perguntas diferentes sem avisar.
 *
 * Os menus são vidro (`tf-glass`): popover é uma das superfícies em que a
 * direção visual permite o efeito. Os cartões de dado, não.
 */

type Opcao = { id: string; nome: string; cor?: string };

export function ReportFilters({
  filtros,
  alterar,
  limpar,
  temFiltro,
  setores,
  pessoas,
  temSemResponsavel,
  onExportar,
  exportarDesabilitado,
}: {
  filtros: FiltrosDoRelatorio;
  alterar: (m: Partial<Omit<FiltrosDoRelatorio, "periodo">>) => void;
  limpar: () => void;
  temFiltro: boolean;
  setores: Opcao[];
  pessoas: Opcao[];
  /** Só oferece "Sem responsável" se existir demanda assim. */
  temSemResponsavel: boolean;
  onExportar: () => void;
  exportarDesabilitado?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SeletorDePeriodo filtros={filtros} alterar={alterar} />

      <SeletorMultiplo
        icone={IconLayoutGrid}
        rotulo="setores"
        vazio="Todos os setores"
        opcoes={setores}
        selecionados={filtros.sectorIds}
        onChange={(ids) => alterar({ sectorIds: ids })}
      />

      <SeletorMultiplo
        icone={IconUser}
        rotulo="responsáveis"
        vazio="Todos os responsáveis"
        opcoes={
          temSemResponsavel
            ? [{ id: SEM_RESPONSAVEL, nome: "Sem responsável" }, ...pessoas]
            : pessoas
        }
        selecionados={filtros.assigneeIds}
        onChange={(ids) => alterar({ assigneeIds: ids })}
      />

      <ComparadorDePeriodo
        ativo={filtros.comparar}
        onChange={(v) => alterar({ comparar: v })}
      />

      <div className="ml-auto flex items-center gap-2">
        {temFiltro ? (
          <Button variant="ghost" size="sm" onClick={limpar}>
            Limpar filtros
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={IconDownload}
          onClick={onExportar}
          disabled={exportarDesabilitado}
        >
          Exportar relatório
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function gatilho(ativo: boolean) {
  return `border-line bg-card text-fg hover:border-line-strong inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
    ativo ? "border-line-strong font-medium" : ""
  }`;
}

const MENU =
  "tf-glass border-line z-50 max-h-80 min-w-56 overflow-y-auto rounded-md border p-1 shadow-[var(--shadow-popover)]";

function SeletorDePeriodo({
  filtros,
  alterar,
}: {
  filtros: FiltrosDoRelatorio;
  alterar: (m: Partial<Omit<FiltrosDoRelatorio, "periodo">>) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const idDe = useId();
  const idAte = useId();

  const rotulo =
    filtros.periodoChave === "custom" && filtros.custom
      ? `${filtros.custom.de.split("-").reverse().join("/")} – ${filtros.custom.ate.split("-").reverse().join("/")}`
      : (PERIODOS.find((p) => p.value === filtros.periodoChave)?.label ??
        "Período");

  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger className={gatilho(true)} aria-label="Período">
        <IconCalendar size={16} stroke={1.75} aria-hidden />
        {rotulo}
        <IconChevronDown size={14} stroke={2} aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={`${MENU} w-64 p-2`}
        >
          <div className="flex flex-col">
            {PERIODOS.filter((p) => p.value !== "custom").map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  alterar({ periodoChave: p.value as ChaveDePeriodo });
                  setAberto(false);
                }}
                aria-pressed={filtros.periodoChave === p.value}
                className={`hover:bg-hover flex items-center rounded-xs px-2 py-1.5 text-left text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                  filtros.periodoChave === p.value
                    ? "text-fg font-medium"
                    : "text-fg-secondary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-line mt-2 border-t pt-2">
            <p className="text-fg-muted mb-1.5 px-2 text-[length:var(--text-caption-size)]">
              Período personalizado
            </p>
            <div className="flex items-end gap-2 px-2">
              <label
                htmlFor={idDe}
                className="text-fg-secondary flex flex-1 flex-col gap-1 text-[length:var(--text-caption-size)]"
              >
                De
                <input
                  id={idDe}
                  type="date"
                  value={filtros.custom?.de ?? ""}
                  max={filtros.custom?.ate || undefined}
                  onChange={(e) =>
                    alterar({
                      periodoChave: "custom",
                      custom: {
                        de: e.target.value,
                        ate: filtros.custom?.ate ?? e.target.value,
                      },
                    })
                  }
                  className="border-line bg-card text-fg h-9 w-full rounded-sm border px-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                />
              </label>
              <label
                htmlFor={idAte}
                className="text-fg-secondary flex flex-1 flex-col gap-1 text-[length:var(--text-caption-size)]"
              >
                Até
                <input
                  id={idAte}
                  type="date"
                  value={filtros.custom?.ate ?? ""}
                  min={filtros.custom?.de || undefined}
                  onChange={(e) =>
                    alterar({
                      periodoChave: "custom",
                      custom: {
                        de: filtros.custom?.de ?? e.target.value,
                        ate: e.target.value,
                      },
                    })
                  }
                  className="border-line bg-card text-fg h-9 w-full rounded-sm border px-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                />
              </label>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SeletorMultiplo({
  icone: Icone,
  rotulo,
  vazio,
  opcoes,
  selecionados,
  onChange,
}: {
  icone: typeof IconUser;
  rotulo: string;
  vazio: string;
  opcoes: Opcao[];
  selecionados: string[];
  onChange: (ids: string[]) => void;
}) {
  if (opcoes.length === 0) return null;

  const escolhidos = new Set(selecionados);
  const texto =
    escolhidos.size === 0
      ? vazio
      : escolhidos.size === 1
        ? (opcoes.find((o) => o.id === selecionados[0])?.nome ?? vazio)
        : `${escolhidos.size} ${rotulo}`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={gatilho(escolhidos.size > 0)}
        aria-label={`Filtrar por ${rotulo}`}
      >
        <Icone size={16} stroke={1.75} aria-hidden />
        <span className="max-w-44 truncate">{texto}</span>
        <IconChevronDown size={14} stroke={2} aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={MENU}>
          {escolhidos.size > 0 ? (
            <DropdownMenu.Item
              onSelect={() => onChange([])}
              className="text-fg-secondary hover:bg-hover flex cursor-default items-center rounded-xs px-2 py-1.5 text-[length:var(--text-small-size)] data-[highlighted]:bg-hover outline-none"
            >
              {vazio}
            </DropdownMenu.Item>
          ) : null}

          {opcoes.map((o) => {
            const marcado = escolhidos.has(o.id);
            return (
              <DropdownMenu.CheckboxItem
                key={o.id}
                checked={marcado}
                // O menu não fecha a cada clique: escolher três setores
                // exigiria abri-lo três vezes.
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(v) =>
                  onChange(
                    v === true
                      ? [...selecionados, o.id]
                      : selecionados.filter((x) => x !== o.id)
                  )
                }
                className="text-fg hover:bg-hover flex cursor-default items-center gap-2 rounded-xs px-2 py-1.5 text-[length:var(--text-small-size)] data-[highlighted]:bg-hover outline-none"
              >
<span
                  aria-hidden
                  className="border-line flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border"
                  style={{
                    background: marcado ? "var(--brand-600)" : "transparent",
                    borderColor: marcado ? "var(--brand-600)" : undefined,
                  }}
                >
                  {marcado ? (
                    <IconCheck size={11} stroke={3} color="white" />
                  ) : null}
                </span>
                {o.cor ? (
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: o.cor }}
                  />
                ) : null}
                <span className="truncate">{o.nome}</span>
              </DropdownMenu.CheckboxItem>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Interruptor de comparação.
 *
 * Botão com `aria-pressed`, e não uma caixa de seleção: é uma ação que muda
 * a tela inteira, e o estado precisa aparecer no próprio controle.
 */
function ComparadorDePeriodo({
  ativo,
  onChange,
}: {
  ativo: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={() => onChange(!ativo)}
      className={gatilho(ativo)}
    >
      <IconFilter size={16} stroke={1.75} aria-hidden />
      Comparar período
      <span
        aria-hidden
        className="relative h-4 w-7 shrink-0 rounded-full transition-colors [transition-duration:var(--dur-fast)]"
        style={{
          background: ativo ? "var(--brand-600)" : "var(--surface-sunken)",
        }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] [transition-duration:var(--dur-fast)]"
          style={{ left: ativo ? "0.875rem" : "0.125rem" }}
        />
      </span>
    </button>
  );
}
