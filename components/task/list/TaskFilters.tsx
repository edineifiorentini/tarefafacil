"use client";

import { IconCheck, IconChevronDown, IconFilter } from "@tabler/icons-react";
import { Popover } from "radix-ui";

import type { ListFilters, StatusFilter } from "@/lib/task/list-view";

/**
 * Os filtros avançados, atrás de um botão.
 *
 * A tela antiga espalhava cinco seletores por uma linha inteira, e quatro
 * deles diziam "Todas" ou "Todos" — ocupavam a largura de um filtro sem
 * filtrar nada. Aqui eles vivem num popover, e o que fica na barra é a
 * CONTAGEM do que está ligado.
 *
 * O popover é vidro (`tf-glass`), como manda a direção visual: menus e
 * popovers podem, cartão de dado não.
 *
 * **Só campos que existem.** Não há "tipo de demanda" nem "situação da
 * aprovação" como campo próprio em `task` — a aprovação vive em
 * `task_approval` e só chega pelo link público. Inventar os dois aqui
 * daria filtros que nunca encontram nada.
 */

export type OpcaoDeFiltro = { value: string; label: string };

const STATUS: OpcaoDeFiltro[] = [
  { value: "todas", label: "Qualquer" },
  { value: "aberta", label: "Abertas" },
  { value: "atrasada", label: "Atrasadas" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
];

const PRIORIDADES: OpcaoDeFiltro[] = [
  { value: "urgente", label: "Urgente" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Normal" },
  { value: "baixa", label: "Baixa" },
  { value: "sem_prioridade", label: "Sem prioridade" },
];

const PRAZOS: OpcaoDeFiltro[] = [
  { value: "7", label: "Próximos 7 dias" },
  { value: "14", label: "Próximos 14 dias" },
  { value: "30", label: "Próximos 30 dias" },
];

export function TaskFilters({
  filtros,
  quantidade,
  setores,
  clientes,
  responsaveis,
  alterar,
  onLimpar,
}: {
  filtros: ListFilters;
  quantidade: number;
  setores: OpcaoDeFiltro[];
  clientes: OpcaoDeFiltro[];
  responsaveis: OpcaoDeFiltro[];
  alterar: (m: Partial<ListFilters>) => void;
  onLimpar: () => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`border-line bg-card text-fg hover:border-line-strong inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
          quantidade > 0 ? "border-line-strong font-medium" : ""
        }`}
      >
        <IconFilter size={16} stroke={1.75} aria-hidden />
        Filtros
        {quantidade > 0 ? (
          <span
            className="tnum rounded-full px-1.5 text-[length:var(--text-caption-size)]"
            style={{
              background: "var(--status-positive-bg)",
              color: "var(--status-positive-fg)",
            }}
          >
            {quantidade}
          </span>
        ) : null}
        <IconChevronDown size={14} stroke={2} aria-hidden />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          // No celular ele ocupa quase a tela toda — é o "drawer" sem
          // trazer um segundo componente para o projeto. A altura máxima
          // impede que a lista de doze setores empurre o botão de limpar
          // para fora da janela.
          className="tf-glass border-line z-50 flex max-h-[min(32rem,80vh)] w-[min(22rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-md border p-4 shadow-[var(--shadow-popover)]"
        >
          <Grupo titulo="Status">
            <Escolha
              opcoes={STATUS}
              valor={filtros.status}
              onEscolher={(v) => alterar({ status: v as StatusFilter })}
            />
          </Grupo>

          {setores.length > 0 ? (
            <Grupo titulo="Setor">
              <Varios
                opcoes={setores}
                selecionados={filtros.sectorIds}
                onMudar={(ids) => alterar({ sectorIds: ids })}
              />
            </Grupo>
          ) : null}

          <Grupo titulo="Prioridade">
            <Varios
              opcoes={PRIORIDADES}
              selecionados={filtros.priorities}
              onMudar={(ids) => alterar({ priorities: ids })}
            />
          </Grupo>

          {clientes.length > 0 ? (
            <Grupo titulo="Cliente">
              <Escolha
                opcoes={[{ value: "", label: "Qualquer" }, ...clientes]}
                valor={filtros.clientId ?? ""}
                onEscolher={(v) => alterar({ clientId: v || null })}
              />
            </Grupo>
          ) : null}

          {responsaveis.length > 0 ? (
            <Grupo titulo="Responsável">
              <Escolha
                opcoes={[{ value: "", label: "Qualquer" }, ...responsaveis]}
                valor={filtros.assigneeId ?? ""}
                onEscolher={(v) => alterar({ assigneeId: v || null })}
              />
            </Grupo>
          ) : null}

          <Grupo titulo="Prazo">
            <Escolha
              opcoes={[{ value: "", label: "Qualquer" }, ...PRAZOS]}
              valor={filtros.dueWithinDays ? String(filtros.dueWithinDays) : ""}
              onEscolher={(v) =>
                alterar({
                  dueWithinDays: v ? (Number(v) as 7 | 14 | 30) : null,
                })
              }
            />
            <Escolha
              opcoes={[
                { value: "", label: "Com ou sem prazo" },
                { value: "com", label: "Só com prazo" },
                { value: "sem", label: "Só sem prazo" },
              ]}
              valor={filtros.temPrazo ?? ""}
              onEscolher={(v) =>
                alterar({ temPrazo: (v || null) as "com" | "sem" | null })
              }
            />
          </Grupo>

          {quantidade > 0 ? (
            <button
              type="button"
              onClick={onLimpar}
              className="border-line text-fg-secondary hover:bg-hover mt-auto rounded-sm border px-3 py-2 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Limpar {quantidade} {quantidade === 1 ? "filtro" : "filtros"}
            </button>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="text-fg-muted mb-1 text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

/** Uma escolha só, em forma de lista — não um `select` nativo dentro do popover. */
function Escolha({
  opcoes,
  valor,
  onEscolher,
}: {
  opcoes: OpcaoDeFiltro[];
  valor: string;
  onEscolher: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={valor === o.value}
          onClick={() => onEscolher(o.value)}
          className={`rounded-full border px-2.5 py-1 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
            valor === o.value
              ? "border-line-strong text-fg bg-sunken font-medium"
              : "border-line text-fg-secondary hover:border-line-strong"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Várias ao mesmo tempo. O check é o sinal, não só a cor de fundo. */
function Varios({
  opcoes,
  selecionados,
  onMudar,
}: {
  opcoes: OpcaoDeFiltro[];
  selecionados: string[];
  onMudar: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const marcado = selecionados.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={marcado}
            onClick={() =>
              onMudar(
                marcado
                  ? selecionados.filter((x) => x !== o.value)
                  : [...selecionados, o.value]
              )
            }
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[length:var(--text-caption-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
              marcado
                ? "border-line-strong text-fg bg-sunken font-medium"
                : "border-line text-fg-secondary hover:border-line-strong"
            }`}
          >
            {marcado ? (
              <IconCheck size={12} stroke={2.5} aria-hidden />
            ) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
