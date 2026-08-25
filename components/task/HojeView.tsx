"use client";

import { IconSparkles } from "@tabler/icons-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useShell } from "@/components/shell/shell-context";
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
import { summarizeToday } from "@/lib/today/summary";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Subtask, Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { DueChip } from "./DueChip";
import { QuickAdd } from "./QuickAdd";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskRow } from "./TaskRow";
import { TodayHeadline } from "./TodayHeadline";

type Group = "atrasadas" | "hoje" | "proximos" | "sem_data";
type Item =
  | { kind: "task"; due: string | null; task: Task }
  | { kind: "subtask"; due: string; subtask: Subtask };

const GROUP_LABELS: Record<Group, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  proximos: "Próximos 7 dias",
  sem_data: "Sem data definida",
};

/**
 * Quantas "sem data" aparecem antes de recolher.
 *
 * Uma empresa que usa o sistema como caixa de entrada acumula centenas de
 * tarefas sem prazo. Despejar todas no fim do Hoje enterraria o que tem
 * prazo hoje — que é o motivo da tela existir.
 */
const SEM_DATA_VISIVEIS = 5;

/**
 * A tela usa a largura toda, mas a LISTA não.
 *
 * O `--max-width-read` existe porque título de tarefa é texto: numa linha de
 * 1400px o olho vai do título à esquerda até o prazo na direita e se perde.
 * Só que ele estava segurando os números junto, e sem `mx-auto` a tela ainda
 * ficava colada na esquerda com metade do monitor vazia.
 *
 * A saída é dar a cada parte a largura que ela merece: a lista fica na
 * largura de leitura, e a faixa de números vai para uma coluna à direita, que
 * acompanha a rolagem. Abaixo de xl não há espaço para duas colunas e ela
 * volta para cima, como estava.
 */
const CONTAINER =
  "mx-auto w-full max-w-[var(--max-width-app)] px-4 pb-8 lg:px-6";

function groupOf(due: string): Group | null {
  const diff = differenceInCalendarDays(parseISO(due), new Date());
  if (diff < 0) return "atrasadas";
  if (diff === 0) return "hoje";
  if (diff >= 1 && diff <= 7) return "proximos";
  return null;
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="text-fg mb-2 flex items-center gap-2 text-[length:var(--text-h3-size)] font-medium">
        {title}
        <span className="tnum text-fg-muted text-[length:var(--text-small-size)] font-normal">
          {count}
        </span>
      </h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

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
  const [verTodasSemData, setVerTodasSemData] = useState(false);

  const hojeISO = localDayISO(new Date());
  const summary = summarizeToday(tasks, sectors, members, hojeISO);

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  const items: Item[] = [
    // Sem data entra agora: antes ela era filtrada aqui e não aparecia em
    // lugar nenhum do Hoje, o que fazia tarefa registrada sem prazo sumir do
    // dia de quem a registrou.
    ...tasks
      .filter((t) => t.completed_at === null && t.cancelled_at === null)
      .map((t) => ({
        kind: "task" as const,
        due: t.due_date,
        task: t,
      })),
    ...datedSubtasks.map((s) => ({
      kind: "subtask" as const,
      due: s.due_date as string,
      subtask: s,
    })),
  ];

  const groups: Record<Group, Item[]> = {
    atrasadas: [],
    hoje: [],
    proximos: [],
    sem_data: [],
  };
  for (const item of items) {
    if (item.due === null) {
      groups.sem_data.push(item);
      continue;
    }
    const g = groupOf(item.due);
    if (g) groups[g].push(item);
  }
  for (const [nome, list] of Object.entries(groups)) {
    if (nome === "sem_data") {
      // Sem prazo para ordenar, a ordem útil é a de chegada — a mais recente
      // primeiro, que é a que a pessoa acabou de registrar.
      list.sort((a, b) =>
        a.kind === "task" && b.kind === "task"
          ? b.task.created_at.localeCompare(a.task.created_at)
          : 0
      );
    } else {
      list.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
    }
  }

  const total =
    groups.atrasadas.length +
    groups.hoje.length +
    groups.proximos.length +
    groups.sem_data.length;

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

  function renderItem(item: Item) {
    if (item.kind === "task") {
      const t = item.task;
      return (
        <TaskRow
          key={`t-${t.id}`}
          task={t}
          sector={sectorsById.get(t.sector_id)}
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
    const s = item.subtask;
    const parent = tasksById.get(s.task_id);
    return (
      <div
        key={`s-${s.id}`}
        className="group hover:bg-hover flex items-center gap-3 rounded-sm py-1 pr-2 pl-8"
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
        <DueChip date={item.due} />
      </div>
    );
  }

  // Enquanto as tarefas não chegam, esqueleto — e não o estado vazio.
  //
  // São dois defeitos no mesmo lugar. O visível: quem tinha demandas via
  // "Seu dia está livre" piscar antes da lista, que é a mentira mais
  // desanimadora que esta tela poderia contar. O invisível: o servidor
  // renderizava o estado vazio e o cliente já hidratava com dados, e o React
  // acusava desencontro de hidratação. Um esqueleto sai igual dos dois lados.
  if (carregando) {
    return (
      <div className={CONTAINER}>
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  if (total === 0) {
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

  return (
    <div className={CONTAINER}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        {/* Ordem trocada por `order`, e não por `flex-row-reverse`: o reverse
            também inverte o empacotamento, e a lista descolava da esquerda —
            ficava boiando no meio, desalinhada do título da página.
            No HTML o resumo vem primeiro de propósito: quem navega por
            teclado ou leitor de tela encontra os números do dia antes da
            lista, que é a mesma ordem de quem lê empilhado no celular. */}
        <aside className="xl:sticky xl:top-4 xl:order-2 xl:w-[21rem] xl:shrink-0">
          <TodayHeadline summary={summary} />
        </aside>

        <div className="min-w-0 flex-1 xl:order-1 xl:max-w-[var(--max-width-read)]">
          {(["atrasadas", "hoje", "proximos"] as const).map((g) =>
            groups[g].length > 0 ? (
              <Section key={g} title={GROUP_LABELS[g]} count={groups[g].length}>
                {groups[g].map(renderItem)}
              </Section>
            ) : null
          )}

          {/* Sem data vem por último e recolhida: ela não tem prazo, então não
          disputa atenção com o que tem. */}
          {groups.sem_data.length > 0 ? (
            <Section
              title={GROUP_LABELS.sem_data}
              count={groups.sem_data.length}
            >
              {(verTodasSemData
                ? groups.sem_data
                : groups.sem_data.slice(0, SEM_DATA_VISIVEIS)
              ).map(renderItem)}

              {groups.sem_data.length > SEM_DATA_VISIVEIS ? (
                <button
                  type="button"
                  onClick={() => setVerTodasSemData((v) => !v)}
                  className="text-fg-secondary hover:text-fg mt-1 w-fit rounded-sm px-3 py-1 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  {verTodasSemData
                    ? "Mostrar menos"
                    : `Ver as outras ${groups.sem_data.length - SEM_DATA_VISIVEIS}`}
                </button>
              ) : null}
            </Section>
          ) : null}
        </div>
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
