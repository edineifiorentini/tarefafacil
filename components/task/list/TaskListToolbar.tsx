"use client";

import { useEffect, useState } from "react";

import {
  IconBookmark,
  IconChevronDown,
  IconLayoutRows,
  IconSearch,
  IconSelect,
  IconSortDescending,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu, Popover } from "radix-ui";

import { Button } from "@/components/ui/Button";
import type { EstadoDaLista, GroupBy, SortBy } from "@/lib/task/list-view";

import { TaskFilters, type OpcaoDeFiltro } from "./TaskFilters";
import type { VisualizacaoSalva } from "./useSavedViews";

/**
 * A barra de comandos: buscar, filtrar, agrupar, ordenar, selecionar,
 * salvar.
 *
 * **Cada controle tem uma aparência diferente do vizinho**, e isso é a
 * correção. A tela antiga alinhava cinco `select` idênticos dizendo
 * "Todas", "Todos os setores", "Todos os responsáveis" — a busca parecia
 * um filtro, o agrupamento parecia um filtro, e o que estava filtrado não
 * aparecia em lugar nenhum. Aqui: a busca é um campo, os filtros são um
 * botão com contador, agrupar e ordenar dizem o valor atual no próprio
 * rótulo ("Agrupar: Nenhum"), e selecionar é um botão de ação.
 */

const GRUPOS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "status", label: "Status" },
  { value: "sector", label: "Setor" },
  { value: "client", label: "Cliente" },
  { value: "assignee", label: "Responsável" },
  { value: "day", label: "Prazo" },
  { value: "priority", label: "Prioridade" },
];

const ORDENS: { value: SortBy; label: string }[] = [
  { value: "due", label: "Prazo mais próximo" },
  { value: "due_desc", label: "Prazo mais distante" },
  { value: "created", label: "Mais recentes" },
  { value: "updated", label: "Atualizadas recentemente" },
  { value: "priority", label: "Prioridade" },
  { value: "title_az", label: "Título de A a Z" },
  { value: "title_za", label: "Título de Z a A" },
];

export function TaskListToolbar({
  estado,
  quantidadeDeFiltros,
  setores,
  clientes,
  responsaveis,
  modoSelecao,
  views,
  alterar,
  onLimparFiltros,
  onModoSelecao,
  onSalvarView,
  onAplicarView,
  onRemoverView,
}: {
  estado: EstadoDaLista;
  quantidadeDeFiltros: number;
  setores: OpcaoDeFiltro[];
  clientes: OpcaoDeFiltro[];
  responsaveis: OpcaoDeFiltro[];
  modoSelecao: boolean;
  views: VisualizacaoSalva[];
  alterar: (m: Partial<EstadoDaLista>) => void;
  onLimparFiltros: () => void;
  onModoSelecao: (on: boolean) => void;
  onSalvarView: (nome: string) => void;
  onAplicarView: (v: VisualizacaoSalva) => void;
  onRemoverView: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Busca
        valor={estado.filtros.q}
        onMudar={(q) => alterar({ filtros: { ...estado.filtros, q } })}
      />

      <TaskFilters
        filtros={estado.filtros}
        quantidade={quantidadeDeFiltros}
        setores={setores}
        clientes={clientes}
        responsaveis={responsaveis}
        alterar={(m) => alterar({ filtros: { ...estado.filtros, ...m } })}
        onLimpar={onLimparFiltros}
      />

      <Seletor
        icone={IconLayoutRows}
        prefixo="Agrupar"
        opcoes={GRUPOS}
        valor={estado.groupBy}
        onEscolher={(v) => alterar({ groupBy: v as GroupBy })}
      />

      <Seletor
        icone={IconSortDescending}
        prefixo="Ordenar"
        opcoes={ORDENS}
        valor={estado.sortBy}
        onEscolher={(v) => alterar({ sortBy: v as SortBy })}
      />

      <Button
        variant={modoSelecao ? "secondary" : "ghost"}
        size="sm"
        leadingIcon={IconSelect}
        aria-pressed={modoSelecao}
        onClick={() => onModoSelecao(!modoSelecao)}
      >
        {modoSelecao ? "Sair da seleção" : "Selecionar"}
      </Button>

      <div className="ml-auto">
        <Visualizacoes
          views={views}
          onSalvar={onSalvarView}
          onAplicar={onAplicarView}
          onRemover={onRemoverView}
        />
      </div>
    </div>
  );
}

/**
 * A busca da tela, que não é a busca global do topo.
 *
 * **Debounce de 300ms com estado local.** Sem ele, cada tecla escreveria
 * na URL e faria uma navegação — o cursor saltaria e o histórico do
 * navegador ganharia uma entrada por letra. O campo mostra o que a pessoa
 * digitou na hora; a URL alcança um instante depois.
 */
function Busca({
  valor,
  onMudar,
}: {
  valor: string;
  onMudar: (q: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  const [ultimoValor, setUltimoValor] = useState(valor);

  // Quando a URL muda POR FORA — voltar do navegador, aplicar uma
  // visualização salva —, o campo acompanha.
  //
  // O ajuste é na RENDERIZAÇÃO, não num efeito. É o padrão que o React
  // documenta para "redefinir estado quando uma prop muda", e o único que
  // não dispara a renderização em cascata que o compilador proíbe: o React
  // reinicia esta renderização antes de tocar no DOM, sem pintar o valor
  // antigo. Um efeito faria a tela mostrar o texto velho por um quadro.
  if (valor !== ultimoValor) {
    setUltimoValor(valor);
    setTexto(valor);
  }

  useEffect(() => {
    if (texto === valor) return;
    const t = setTimeout(() => onMudar(texto), 300);
    return () => clearTimeout(t);
  }, [texto, valor, onMudar]);

  return (
    <div className="relative min-w-56 flex-1">
      <IconSearch
        aria-hidden
        size={16}
        stroke={1.75}
        className="text-fg-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      />
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por título, cliente ou responsável…"
        aria-label="Buscar demandas"
        className="tf-glass border-line text-fg placeholder:text-fg-muted h-9 w-full rounded-sm border pr-3 pl-9 text-[length:var(--text-small-size)]"
      />
    </div>
  );
}

/**
 * Agrupar e ordenar. O rótulo diz o valor ATUAL — "Agrupar: Nenhum" —, e
 * é isso que os distingue de um filtro: eles nunca escondem linha, só
 * mudam a apresentação.
 */
function Seletor({
  icone: Icone,
  prefixo,
  opcoes,
  valor,
  onEscolher,
}: {
  icone: typeof IconLayoutRows;
  prefixo: string;
  opcoes: { value: string; label: string }[];
  valor: string;
  onEscolher: (v: string) => void;
}) {
  const atual = opcoes.find((o) => o.value === valor)?.label ?? opcoes[0].label;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="border-line bg-card text-fg hover:border-line-strong inline-flex h-9 max-w-56 items-center gap-2 rounded-sm border px-3 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
        <Icone size={16} stroke={1.75} aria-hidden />
        <span className="truncate">
          <span className="text-fg-secondary">{prefixo}:</span> {atual}
        </span>
        <IconChevronDown size={14} stroke={2} aria-hidden className="shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="tf-glass border-line z-50 min-w-52 rounded-md border p-1 shadow-[var(--shadow-popover)]"
        >
          {opcoes.map((o) => (
            <DropdownMenu.Item
              key={o.value}
              onSelect={() => onEscolher(o.value)}
              className={`data-[highlighted]:bg-hover flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none ${
                o.value === valor ? "text-fg font-medium" : "text-fg-secondary"
              }`}
            >
              {o.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Salvar e reabrir um recorte.
 *
 * O aviso sobre não sincronizar entre aparelhos fica DENTRO do popover, e
 * não escondido na documentação: quem salva ali precisa saber que não vai
 * achar o mesmo no celular.
 */
function Visualizacoes({
  views,
  onSalvar,
  onAplicar,
  onRemover,
}: {
  views: VisualizacaoSalva[];
  onSalvar: (nome: string) => void;
  onAplicar: (v: VisualizacaoSalva) => void;
  onRemover: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");

  function salvar() {
    const limpo = nome.trim();
    if (!limpo) return;
    onSalvar(limpo);
    setNome("");
    setAberto(false);
  }

  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger className="text-fg-secondary hover:text-fg hover:bg-hover inline-flex h-9 items-center gap-2 rounded-sm px-3 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
        <IconBookmark size={16} stroke={1.75} aria-hidden />
        Salvar visualização
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="tf-glass border-line z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-md border p-3 shadow-[var(--shadow-popover)]"
        >
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
          >
            <label
              htmlFor="nome-da-visualizacao"
              className="text-fg text-[length:var(--text-small-size)] font-medium"
            >
              Salvar o recorte atual
            </label>
            <div className="flex gap-2">
              <input
                id="nome-da-visualizacao"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Atrasadas de Obras"
                className="border-line bg-card text-fg placeholder:text-fg-muted h-9 w-full rounded-sm border px-2.5 text-[length:var(--text-small-size)]"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!nome.trim()}
              >
                Salvar
              </Button>
            </div>
            <p className="text-fg-muted text-[length:var(--text-caption-size)]">
              Guarda busca, filtros, agrupamento e ordenação — neste
              navegador. Ainda não acompanha entre aparelhos.
            </p>
          </form>

          {views.length > 0 ? (
            <div className="border-line flex flex-col gap-1 border-t pt-3">
              {views.map((v) => (
                <div key={v.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAplicar(v);
                      setAberto(false);
                    }}
                    className="text-fg hover:bg-hover min-w-0 flex-1 truncate rounded-sm px-2 py-1.5 text-left text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    {v.nome}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemover(v.id)}
                    aria-label={`Remover a visualização ${v.nome}`}
                    className="text-fg-muted hover:text-overdue hover:bg-hover inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    <IconTrash size={14} stroke={1.75} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
