"use client";

import { useMemo, useState } from "react";

import { IconChevronRight, IconLayoutList } from "@tabler/icons-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useBulkTaskActions } from "@/lib/queries/useBulkTasks";
import { useClients } from "@/lib/queries/useClients";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import {
  countOpenSubtasks,
  useCompleteTask,
  useDeleteTask,
  useTasks,
  useToggleTaskCancel,
  useToggleTaskComplete,
  useUpdateTask,
} from "@/lib/queries/useTasks";
import { useFuso } from "@/lib/queries/useFuso";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { useWorkspaceColumns } from "@/lib/queries/useWorkspaceColumns";
import {
  contarFiltrosAtivos,
  estadoDaURL,
  filterTasks,
  groupTasks,
  sortTasks,
} from "@/lib/task/list-view";
import { aplicarVisao, contarVisoes } from "@/lib/task/quick-views";
import type { Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { TaskDetailPanel } from "./TaskDetailPanel";
import {
  ActiveFilterChips,
  chipsDosFiltros,
} from "./list/ActiveFilterChips";
import { BulkActionBar } from "./list/BulkActionBar";
import { TaskListHeader } from "./list/TaskListHeader";
import { TaskListRow } from "./list/TaskListRow";
import { TaskListSkeleton } from "./list/TaskListSkeleton";
import { TaskListToolbar } from "./list/TaskListToolbar";
import { TaskQuickViews } from "./list/TaskQuickViews";
import { useEstadoDaLista } from "./list/useEstadoDaLista";
import { useSavedViews } from "./list/useSavedViews";

/**
 * A Lista.
 *
 * COMO A TELA SE MONTA, e a ordem importa:
 *
 * 1. as demandas do workspace (cache já compartilhado com Quadro e Hoje);
 * 2. os FILTROS avançados — é sobre este recorte que os números dos chips
 *    são contados, para "Atrasadas 4" dizer quatro dentro do que está
 *    filtrado, e não quatro no workspace inteiro;
 * 3. a VISÃO rápida;
 * 4. ordenação e agrupamento, que só mudam a apresentação.
 *
 * **As concluídas ficam num bloco recolhido no fim.** Era o defeito mais
 * caro da tela antiga: num workspace com um mês de uso há mais concluídas
 * que abertas, e a primeira coisa que se via era uma parede de títulos
 * riscados. Agora a visão inicial é "Em aberto", e as concluídas aparecem
 * atrás de um botão que diz quantas são.
 *
 * O estado inteiro vive na URL (`useEstadoDaLista`) — por isso voltar do
 * detalhe devolve a mesma lista, e o link vale como link.
 */
export function ListView() {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: tasks = [], isLoading, isError, refetch } = useTasks(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const { data: colunas = [] } = useWorkspaceColumns(workspace.id);
  const { openPanel } = useShell();

  const toggle = useToggleTaskComplete(workspace.id);
  const complete = useCompleteTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const toggleCancel = useToggleTaskCancel(workspace.id);
  const update = useUpdateTask(workspace.id);
  const bulk = useBulkTaskActions(workspace.id);

  const { estado, alterar, limpar } = useEstadoDaLista();
  const { views, salvar, remover } = useSavedViews(
    userId ?? undefined,
    workspace.id
  );

  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [concluidasAbertas, setConcluidasAbertas] = useState(false);
  const [gruposFechados, setGruposFechados] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ task: Task; count: number } | null>(
    null
  );

  // ---------------------------------------------------------------- mapas
  const sectorById = useMemo(
    () => new Map(sectors.map((s) => [s.id, s])),
    [sectors]
  );
  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients]
  );
  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.display_name ?? m.email])),
    [members]
  );
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members]
  );
  const colunaById = useMemo(
    () => new Map(colunas.map((c) => [c.id, c.name])),
    [colunas]
  );
  const membrosAtivos = useMemo(
    () =>
      members
        .filter((m) => m.status === "active")
        .map((m) => ({ id: m.user_id, nome: m.display_name ?? m.email })),
    [members]
  );

  // --------------------------------------------------------------- cálculo
  /**
   * A busca olha título, cliente e responsável — como diz o campo.
   *
   * `filterTasks` só sabe título (ela é usada por outras telas). Aqui a
   * busca é ampliada ANTES, sobre os nomes já resolvidos: cliente e
   * responsável são id na demanda, e comparar id com texto digitado nunca
   * encontraria nada.
   */
  const comBusca = useMemo(() => {
    const q = estado.filtros.q.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      const cliente = t.client_id ? clientNameById.get(t.client_id) : null;
      if (cliente?.toLowerCase().includes(q)) return true;
      const pessoa = t.assignee_id ? memberNameById.get(t.assignee_id) : null;
      if (pessoa?.toLowerCase().includes(q)) return true;
      const setor = sectorById.get(t.sector_id)?.name;
      return !!setor?.toLowerCase().includes(q);
    });
  }, [tasks, estado.filtros.q, clientNameById, memberNameById, sectorById]);

  // O fuso que a pessoa salvou. Sem ele, "atrasada" e "vence hoje" sairiam
  // do relógio do aparelho — e o sino, que usa o salvo, discordaria da
  // Lista na virada do dia.
  const fuso = useFuso();

  const comFiltros = useMemo(
    // A busca já foi aplicada acima; aqui só os filtros avançados.
    () => filterTasks(comBusca, { ...estado.filtros, q: "" }, new Date(), fuso),
    [comBusca, estado.filtros, fuso]
  );

  const contagens = useMemo(
    () => contarVisoes(comFiltros, new Date(), fuso),
    [comFiltros, fuso]
  );

  const naVisao = useMemo(
    () => aplicarVisao(comFiltros, estado.visao, new Date(), fuso),
    [comFiltros, estado.visao, fuso]
  );

  const ordenadas = useMemo(
    () => sortTasks(naVisao, estado.sortBy, clientNameById, new Date(), fuso),
    [naVisao, estado.sortBy, clientNameById, fuso]
  );

  const grupos = useMemo(
    () =>
      groupTasks(ordenadas, estado.groupBy, {
        clientNameById,
        memberNameById,
        sectorById,
      }),
    [ordenadas, estado.groupBy, clientNameById, memberNameById, sectorById]
  );

  /**
   * As concluídas do bloco do fim.
   *
   * Só existem quando a visão é "Em aberto" e não há agrupamento: nas
   * outras, ou elas não pertencem ao recorte, ou o agrupamento escolhido já
   * é a divisão que a pessoa pediu — e dois níveis de agrupamento na mesma
   * tela viram um labirinto.
   */
  const concluidas = useMemo(() => {
    if (estado.visao !== "aberto" || estado.groupBy !== "none") return [];
    return sortTasks(
      comFiltros.filter((t) => t.completed_at && !t.cancelled_at),
      estado.sortBy,
      clientNameById
    );
  }, [comFiltros, estado.visao, estado.groupBy, estado.sortBy, clientNameById]);

  const visiveis = useMemo(
    () => grupos.flatMap((g) => g.tasks),
    [grupos]
  );
  const total = visiveis.length;
  const quantidadeDeFiltros = contarFiltrosAtivos(estado.filtros);

  const chips = chipsDosFiltros(
    estado.filtros,
    {
      setor: (id) => sectorById.get(id)?.name ?? "Setor removido",
      cliente: (id) => clientNameById.get(id) ?? "Cliente removido",
      responsavel: (id) => memberNameById.get(id) ?? "Removido",
      prioridade: (v) =>
        ({
          urgente: "Urgente",
          alta: "Alta",
          media: "Normal",
          baixa: "Baixa",
          sem_prioridade: "Sem prioridade",
        })[v] ?? v,
      status: (v) =>
        ({
          aberta: "Abertas",
          atrasada: "Atrasadas",
          concluida: "Concluídas",
          cancelada: "Canceladas",
        })[v] ?? v,
    },
    (m) => alterar({ filtros: { ...estado.filtros, ...m } })
  );

  // ----------------------------------------------------------------- ações
  async function handleToggle(task: Task, concluir: boolean) {
    if (!concluir) {
      toggle.mutate({ id: task.id, completed: false });
      return;
    }
    // A confirmação de subtarefas abertas é comportamento existente, e
    // continua: concluir a mãe sem avisar deixa filhas penduradas.
    const abertas = await countOpenSubtasks(task.id);
    if (abertas > 0) {
      setConfirm({ task, count: abertas });
      return;
    }
    toggle.mutate({ id: task.id, completed: true });
  }

  function abrir(task: Task) {
    openPanel({
      title: "Tarefa",
      node: <TaskDetailPanel taskId={task.id} />,
    });
  }

  function alternarSelecao(id: string, on: boolean) {
    setSelecionadas((prev) => {
      const proximo = new Set(prev);
      if (on) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }

  function emLote(acao: (ids: string[]) => void) {
    acao([...selecionadas]);
    setSelecionadas(new Set());
  }

  const idsVisiveis = visiveis.map((t) => t.id);
  const todasSelecionadas =
    idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionadas.has(id));

  function renderLinha(task: Task) {
    const responsavelId = task.assignee_id;
    const membro = responsavelId ? memberById.get(responsavelId) : undefined;
    const cliente = task.client_id ? clientNameById.get(task.client_id) : null;

    return (
      <TaskListRow
        key={task.id}
        task={task}
        sector={sectorById.get(task.sector_id)}
        coluna={task.column_id ? colunaById.get(task.column_id) : null}
        responsavel={
          membro
            ? {
                nome: membro.display_name ?? membro.email,
                avatarUrl: membro.avatar_url,
              }
            : null
        }
        secundaria={cliente}
        membros={membrosAtivos}
        modoSelecao={modoSelecao}
        selecionada={selecionadas.has(task.id)}
        denso={false}
        onSelectChange={(on) => alternarSelecao(task.id, on)}
        onToggle={(c) => handleToggle(task, c)}
        onToggleCancel={(cancel) =>
          toggleCancel.mutate({ id: task.id, cancel })
        }
        onDelete={() => deleteTask(task)}
        onOpen={() => abrir(task)}
        onAtribuir={(uid) =>
          update.mutate({ id: task.id, patch: { assignee_id: uid } })
        }
        // Editar prazo abre o detalhe, onde o campo de data já existe com
        // hora de início, hora de fim e a regra do Google Agenda junto.
        // Um seletor de data solto na lista seria um segundo lugar de
        // editar prazo, com metade das regras.
        onEditarPrazo={() => abrir(task)}
      />
    );
  }

  // --------------------------------------------------------------- estados
  if (isError) {
    return (
      <Casca>
        <div className="border-line bg-card flex flex-col items-start gap-3 rounded-md border p-6">
          <p className="text-fg text-[length:var(--text-small-size)] font-medium">
            Não foi possível carregar as demandas.
          </p>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Seus filtros continuam aplicados — nada do que você montou se
            perdeu.
          </p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Casca>
    );
  }

  const listaVazia = !isLoading && tasks.length === 0;

  return (
    <Casca>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-fg text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-semibold">
            Lista
          </h2>
          <p className="text-fg-secondary mt-1">
            Encontre, organize e atualize todas as demandas.
          </p>
        </div>
        {/* A contagem é do RECORTE, não do workspace. Um total absoluto ao
            lado de uma lista filtrada faz quem lê procurar as demandas que
            faltam. */}
        <span
          aria-live="polite"
          className="tnum text-fg-secondary text-[length:var(--text-small-size)]"
        >
          {isLoading
            ? "…"
            : `${total} ${total === 1 ? "demanda" : "demandas"}`}
        </span>
      </header>

      <div className="border-line bg-card flex flex-col gap-3 rounded-md border p-3 shadow-[var(--shadow-card)]">
        <TaskListToolbar
          estado={estado}
          quantidadeDeFiltros={quantidadeDeFiltros}
          setores={sectors.map((s) => ({ value: s.id, label: s.name }))}
          clientes={clients.map((c) => ({ value: c.id, label: c.name }))}
          responsaveis={membrosAtivos.map((m) => ({
            value: m.id,
            label: m.nome,
          }))}
          modoSelecao={modoSelecao}
          views={views}
          alterar={alterar}
          onLimparFiltros={limpar}
          onModoSelecao={(on) => {
            setModoSelecao(on);
            // Sair do modo não pode deixar seleção pendurada: a barra some
            // e as linhas ficariam marcadas sem sinal disso.
            if (!on) setSelecionadas(new Set());
          }}
          onSalvarView={(nome) => salvar(nome, estado)}
          onAplicarView={(v) =>
            alterar(estadoDaURL(new URLSearchParams(v.busca)))
          }
          onRemoverView={remover}
        />

        <TaskQuickViews
          atual={estado.visao}
          contagens={contagens}
          onChange={(v) => alterar({ visao: v })}
        />

        <ActiveFilterChips chips={chips} onLimpar={limpar} />
      </div>

      <div className="tf-lista border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
        {isLoading ? (
          <TaskListSkeleton />
        ) : total === 0 ? (
          <EmptyState
            icon={IconLayoutList}
            title={
              listaVazia
                ? "Ainda não existem demandas"
                : "Nenhuma demanda encontrada"
            }
            description={
              listaVazia
                ? "Crie a primeira demanda para começar a organizar o trabalho."
                : "Tente alterar a busca ou remover alguns filtros."
            }
            action={
              listaVazia ? undefined : (
                <Button variant="secondary" size="sm" onClick={limpar}>
                  Limpar filtros
                </Button>
              )
            }
          />
        ) : (
          <>
            <TaskListHeader
              modoSelecao={modoSelecao}
              todasSelecionadas={todasSelecionadas}
              algumaSelecionada={selecionadas.size > 0 && !todasSelecionadas}
              onSelecionarTodas={(on) =>
                setSelecionadas(on ? new Set(idsVisiveis) : new Set())
              }
            />

            {estado.groupBy === "none"
              ? grupos[0]?.tasks.map(renderLinha)
              : grupos.map((g) => {
                  const fechado = gruposFechados.has(g.key);
                  return (
                    <section key={g.key}>
                      <CabecalhoDeGrupo
                        rotulo={g.label}
                        quantidade={g.tasks.length}
                        aberto={!fechado}
                        onAlternar={() =>
                          setGruposFechados((prev) => {
                            const p = new Set(prev);
                            if (p.has(g.key)) p.delete(g.key);
                            else p.add(g.key);
                            return p;
                          })
                        }
                      />
                      {fechado ? null : g.tasks.map(renderLinha)}
                    </section>
                  );
                })}
          </>
        )}

        {/* As concluídas, recolhidas. Não abrem a tela cheia de riscado. */}
        {concluidas.length > 0 ? (
          <section className="border-line border-t">
            <CabecalhoDeGrupo
              rotulo="Concluídas"
              quantidade={concluidas.length}
              aberto={concluidasAbertas}
              acao={concluidasAbertas ? "Ocultar" : "Exibir concluídas"}
              onAlternar={() => setConcluidasAbertas((v) => !v)}
            />
            {concluidasAbertas ? concluidas.map(renderLinha) : null}
          </section>
        ) : null}
      </div>

      <BulkActionBar
        quantidade={selecionadas.size}
        setores={sectors.map((s) => ({ value: s.id, label: s.name }))}
        onConcluir={() => emLote((ids) => bulk.complete.mutate(ids))}
        onCancelar={() => emLote((ids) => bulk.cancel.mutate(ids))}
        onMoverParaSetor={(sectorId) =>
          emLote((ids) => bulk.moveToSector.mutate({ ids, sectorId }))
        }
        onExcluir={() => emLote((ids) => bulk.remove.mutate(ids))}
        onLimpar={() => setSelecionadas(new Set())}
      />

      {confirm ? (
        <ConfirmCompleteDialog
          open
          count={confirm.count}
          onOpenChange={(o) => {
            if (!o) setConfirm(null);
          }}
          onCompleteAll={() => {
            complete.mutate({ id: confirm.task.id, alsoSubtasks: true });
            setConfirm(null);
          }}
          onCompleteTaskOnly={() => {
            toggle.mutate({ id: confirm.task.id, completed: true });
            setConfirm(null);
          }}
        />
      ) : null}
    </Casca>
  );
}

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-app)] flex-col gap-[var(--space-block-gap)] px-4 pb-24 lg:px-6">
      {children}
    </div>
  );
}

function CabecalhoDeGrupo({
  rotulo,
  quantidade,
  aberto,
  acao,
  onAlternar,
}: {
  rotulo: string;
  quantidade: number;
  aberto: boolean;
  acao?: string;
  onAlternar: () => void;
}) {
  return (
    <div className="border-line bg-sunken/40 flex items-center gap-2 border-b px-4 py-2">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        className="text-fg hover:text-fg-link inline-flex items-center gap-1.5 rounded-xs text-[length:var(--text-small-size)] font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <IconChevronRight
          size={15}
          stroke={2}
          aria-hidden
          className={`transition-transform [transition-duration:var(--dur-fast)] ${aberto ? "rotate-90" : ""}`}
        />
        {rotulo}
        <span className="text-fg-secondary font-normal">
          · {quantidade} {quantidade === 1 ? "demanda" : "demandas"}
        </span>
      </button>

      {acao ? (
        <button
          type="button"
          onClick={onAlternar}
          className="text-fg-link ml-auto rounded-xs text-[length:var(--text-caption-size)] outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          {acao}
        </button>
      ) : null}
    </div>
  );
}

