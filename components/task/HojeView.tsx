"use client";

import { IconChevronRight, IconSparkles } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { PendingDistributionCard } from "@/components/today/PendingDistributionCard";
import { PriorityTabs, type TabDef } from "@/components/today/PriorityTabs";
import { TodayIndicators } from "@/components/today/TodayIndicators";
import { UpcomingCard } from "@/components/today/UpcomingCard";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { localDayISO } from "@/lib/dates/day";
import { useDatedSubtasks, useToggleDatedSubtask } from "@/lib/queries/useHoje";
import { useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import {
  countOpenSubtasks,
  useCompleteTask,
  useDeleteTask,
  useTasks,
  useToggleTaskComplete,
  useUpdateTask,
} from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import {
  bucketTasks,
  countConcluidasHoje,
  distribute,
  type Bucket,
} from "@/lib/today/summary";
import type { Subtask, Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { DueChip } from "./DueChip";
import { QuickAdd } from "./QuickAdd";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskRow } from "./TaskRow";

const TITULOS: Record<Bucket, string> = {
  atrasadas: "Atrasadas",
  hoje: "Para hoje",
  proximos: "Próximos dias",
  sem_data: "Sem data definida",
};

/**
 * Frase de balde vazio, escrita uma a uma.
 *
 * Minusculando o título dentro de um molde saía "Nada em para hoje" — o tipo
 * de frase que denuncia que ninguém leu a tela depois de pronta.
 */
const VAZIOS: Record<Bucket, string> = {
  atrasadas: "Nenhuma demanda atrasada",
  hoje: "Nenhuma demanda vence hoje",
  proximos: "Nenhuma demanda nos próximos dias",
  sem_data: "Toda demanda aberta tem prazo",
};

/**
 * Quantas "sem data" aparecem antes de recolher.
 *
 * Uma empresa que usa o sistema como caixa de entrada acumula centenas de
 * tarefas sem prazo. Despejar todas de uma vez enterraria o que tem prazo
 * hoje — que é o motivo da tela existir.
 */
const SEM_DATA_VISIVEIS = 8;

export function HojeView() {
  const workspace = useWorkspace();
  const { data: tasks = [], isPending: carregando } = useTasks(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: datedSubtasks = [] } = useDatedSubtasks(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const toggle = useToggleTaskComplete(workspace.id);
  const complete = useCompleteTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const toggleSub = useToggleDatedSubtask(workspace.id);
  const updateTask = useUpdateTask(workspace.id);
  const { openPanel } = useShell();

  const [confirm, setConfirm] = useState<{ task: Task; count: number } | null>(
    null
  );
  const [aba, setAba] = useState<Bucket>("atrasadas");
  const [verTudo, setVerTudo] = useState(false);

  const hojeISO = localDayISO(new Date());
  const baldes = bucketTasks(tasks, hojeISO);
  const concluidas = countConcluidasHoje(tasks, hojeISO);

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  // Etapas com prazo próprio entram junto na faixa dos próximos dias, que é
  // onde elas eram visíveis antes. Não entram na distribuição: ela conta
  // demandas, e misturar etapa inflaria a carga do setor.
  const subtasksProximos = datedSubtasks.filter(
    (s) => s.due_date && s.due_date > hojeISO
  );

  const lista = baldes[aba];
  const distribuicao = distribute(lista, sectors, members);

  const abas: TabDef[] = [
    { id: "atrasadas", label: "Atrasadas", count: baldes.atrasadas.length },
    { id: "hoje", label: "Para hoje", count: baldes.hoje.length },
    { id: "proximos", label: "Próximos dias", count: baldes.proximos.length },
    { id: "sem_data", label: "Sem data", count: baldes.sem_data.length },
  ];

  const totalAberto =
    baldes.atrasadas.length +
    baldes.hoje.length +
    baldes.proximos.length +
    baldes.sem_data.length;

  function openTask(id: string) {
    openPanel({ title: "Tarefa", node: <TaskDetailPanel taskId={id} /> });
  }

  async function handleToggle(task: Task, completed: boolean) {
    if (!completed) {
      toggle.mutate({ id: task.id, completed: false });
      return;
    }
    const open = await countOpenSubtasks(task.id);
    if (open > 0) {
      setConfirm({ task, count: open });
      return;
    }
    toggle.mutate({ id: task.id, completed: true });
  }

  function renderTask(t: Task) {
    return (
      <TaskRow
        key={t.id}
        task={t}
        sector={sectorsById.get(t.sector_id)}
        mostrarSemResponsavel
        onToggle={(c) => handleToggle(t, c)}
        onDelete={() => deleteTask(t)}
        onOpen={() => openTask(t.id)}
        onSetToday={
          t.due_date === null
            ? () =>
                updateTask.mutate({ id: t.id, patch: { due_date: hojeISO } })
            : undefined
        }
      />
    );
  }

  function renderSubtask(s: Subtask) {
    const parent = tasksById.get(s.task_id);
    return (
      <div
        key={s.id}
        className="group hover:bg-hover flex items-center gap-3 rounded-md py-2 pr-3 pl-8"
      >
        <Checkbox
          variant="round"
          checked={false}
          onCheckedChange={() => toggleSub.mutate(s.id)}
          aria-label="Concluir etapa"
        />
        <button
          type="button"
          onClick={() => parent && openTask(parent.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-fg truncate text-[length:var(--text-small-size)]">
            {s.title}
          </span>
          {parent ? (
            <span className="text-fg-muted shrink-0 text-[length:var(--text-caption-size)]">
              · {parent.title}
            </span>
          ) : null}
        </button>
        {s.due_date ? <DueChip date={s.due_date} /> : null}
      </div>
    );
  }

  // Esqueleto enquanto as tarefas não chegam — e não o estado vazio. Quem
  // tinha demandas via "Seu dia está livre" piscar antes da lista, que é a
  // mentira mais desanimadora que esta tela poderia contar. O servidor
  // renderiza o mesmo esqueleto, então também não há desencontro de
  // hidratação.
  if (carregando) {
    return (
      <div className={CONTAINER}>
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  if (totalAberto === 0 && concluidas === 0) {
    return (
      <EmptyState
        icon={IconSparkles}
        title="Seu dia está livre"
        description="Nada com prazo para agora. Registre a próxima tarefa."
        action={
          <Button
            variant="primary"
            onClick={() =>
              openPanel({ title: "Nova tarefa", node: <QuickAdd /> })
            }
          >
            Nova tarefa
          </Button>
        }
      />
    );
  }

  const visiveis =
    aba === "sem_data" && !verTudo ? lista.slice(0, SEM_DATA_VISIVEIS) : lista;
  const escondidas = lista.length - visiveis.length;

  return (
    <div className={CONTAINER}>
      <div className="flex flex-col gap-[var(--space-block-gap)]">
        <TodayIndicators
          atrasadas={baldes.atrasadas.length}
          hoje={baldes.hoje.length}
          semData={baldes.sem_data.length}
          concluidas={concluidas}
          active={aba}
          onSelect={setAba}
        />

        {/* 8 e 4 de doze: a lista precisa de largura de leitura e a
            distribuição é só rótulo mais barra. Abaixo de xl viram uma
            coluna, com a distribuição depois da lista. */}
        <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-12">
          <section className="border-line bg-card flex flex-col gap-4 rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)] xl:col-span-8">
            <h2 className="text-fg text-[length:var(--text-h3-size)] font-medium">
              Prioridades
            </h2>

            <PriorityTabs tabs={abas} active={aba} onChange={setAba} />

            <div className="flex items-baseline gap-2">
              <h3 className="text-fg font-medium">{TITULOS[aba]}</h3>
              <span className="tnum text-fg-muted text-[length:var(--text-small-size)]">
                {lista.length}
              </span>
            </div>

            {lista.length === 0 ? (
              <p className="text-fg-secondary py-6 text-center text-[length:var(--text-small-size)]">
                {VAZIOS[aba]}
              </p>
            ) : (
              <div className="flex flex-col">{visiveis.map(renderTask)}</div>
            )}

            {escondidas > 0 ? (
              <button
                type="button"
                onClick={() => setVerTudo(true)}
                className="text-fg-secondary hover:text-fg w-fit rounded-sm px-3 py-1 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                Ver as outras {escondidas}
              </button>
            ) : null}

            <Link
              href="/lista"
              className="border-line text-fg-link -mx-[var(--space-card-pad)] mt-1 -mb-[var(--space-card-pad)] flex items-center justify-between border-t px-[var(--space-card-pad)] py-3 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Ver todas as demandas
              <IconChevronRight size={16} stroke={1.75} aria-hidden />
            </Link>
          </section>

          <div className="xl:col-span-4">
            <PendingDistributionCard
              distribution={distribuicao}
              total={lista.length}
            />
          </div>
        </div>

        <UpcomingCard count={baldes.proximos.length + subtasksProximos.length}>
          {baldes.proximos.map(renderTask)}
          {subtasksProximos.map(renderSubtask)}
        </UpcomingCard>
      </div>

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
    </div>
  );
}

/**
 * A tela usa a largura toda; o conteúdo respira dentro de um grid.
 *
 * Antes a página ficava presa em 720px E colada na esquerda, com metade do
 * monitor vazio. Agora acompanha Dashboard e Lista, que já usam
 * `--max-width-app`.
 */
const CONTAINER =
  "mx-auto w-full max-w-[var(--max-width-app)] px-4 pb-8 lg:px-6";
