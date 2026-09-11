"use client";

import {
  IconBan,
  IconCheck,
  IconClock,
  IconLoader2,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useShell } from "@/components/shell/shell-context";
import { Select } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { TextInput } from "@/components/ui/TextInput";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import { useClients } from "@/lib/queries/useClients";
import { useSyncTaskEvent } from "@/lib/queries/useGcal";
import { useMembers } from "@/lib/queries/useMembers";
import { useProjects } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import {
  useDeleteTask,
  useTaskDetail,
  useToggleTaskCancel,
  useUpdateTask,
} from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sectorOptions } from "@/lib/sectors/options";
import type { TablesUpdate, TaskPriority } from "@/types/database";

import { GcalEditedBadge } from "@/components/gcal/GcalEditedBadge";

import { AttachmentList } from "./AttachmentList";
import { CommentList } from "./CommentList";
import { DependencySelector } from "./DependencySelector";
import { InsightLog } from "./InsightLog";
import { ParticipantsSelector } from "./ParticipantsSelector";
import { SubtaskList } from "./SubtaskList";
import { TaskActivityLog } from "./TaskActivityLog";
import { TagSelector } from "./TagSelector";
import { TaskMeetToggle } from "./TaskMeetToggle";
import { TaskSyncToggle } from "./TaskSyncToggle";
import { TimeTracking } from "./TimeTracking";
import { TaskActions } from "./TaskActions";
import { TaskApprovalTab } from "./TaskApprovalTab";
import { ordenarDestinos, type DestinoId } from "@/lib/tarefas/destinos";
import { DestinosSelector } from "./destinos/DestinosSelector";

const PRIORITIES = [
  { value: "sem_prioridade", label: "Sem prioridade" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

type SaveStatus = "idle" | "saving" | "saved";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-fg-muted text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

type TarefaDetalhada = NonNullable<ReturnType<typeof useTaskDetail>["data"]>;

/**
 * A tarefa, buscada antes de o formulário existir.
 *
 * **A separação conserta um defeito de estado inicial.** O formulário
 * guarda título, setor, prioridade e o resto em `useState`, semeados a
 * partir da tarefa — e `useState` só lê o valor inicial UMA vez. Quando o
 * componente montava com a busca ainda em voo, todos os campos nasciam
 * vazios e não se corrigiam quando a resposta chegava.
 *
 * Pelo modal isso nunca aparecia: a Lista, o Quadro e o Calendário já
 * deixam a demanda no cache antes de alguém clicar. A rota
 * `/tarefa/[id]` abre fria — e ali a tela mostrava título em branco,
 * "Selecione…" no setor e "Normal" numa demanda urgente. Encontrado em
 * 9/set/2026, abrindo a página nova.
 *
 * O `key` é a outra metade: sem ele, ir de uma tarefa para outra reusaria
 * a mesma instância e o estado da anterior ficaria na tela.
 */
export function TaskDetailPanel({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: task } = useTaskDetail(workspace.id, taskId);

  if (!task) {
    return <p className="text-fg-secondary">Carregando…</p>;
  }

  return <TaskDetailForm key={task.id} task={task} taskId={taskId} />;
}

function TaskDetailForm({
  task,
  taskId,
}: {
  task: TarefaDetalhada;
  taskId: string;
}) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const update = useUpdateTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const toggleCancel = useToggleTaskCancel(workspace.id);
  const syncEvent = useSyncTaskEvent();
  // Fecha o MODAL, não o painel: a tarefa mora nele desde 9/set/2026, e
  // `closePanel` virou no-op — excluir deixava o modal aberto mostrando uma
  // tarefa que já não existe.
  const { closeModal } = useShell();
  const router = useRouter();
  const caminho = usePathname();

  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef<TablesUpdate<"task">>({});
  const timer = useRef<number | undefined>(undefined);

  const [title, setTitle] = useState(task.title ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [sectorId, setSectorId] = useState(task.sector_id ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [dueTime, setDueTime] = useState((task.due_time ?? "").slice(0, 5));
  const [dueEndTime, setDueEndTime] = useState(
    (task.due_end_time ?? "").slice(0, 5)
  );
  const [timeOpen, setTimeOpen] = useState(!!task.due_time);
  const [endOpen, setEndOpen] = useState(!!task.due_end_time);
  const [priority, setPriority] = useState<string>(task.priority ?? "media");
  const [projectId, setProjectId] = useState<string | null>(
    task.project_id ?? null
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(
    task.assignee_id ?? null
  );
  const [clientId, setClientId] = useState<string | null>(
    task.client_id ?? null
  );
  const [service, setService] = useState(task.service ?? "");
  const [estimateHours, setEstimateHours] = useState(
    task.estimate_minutes ? String(task.estimate_minutes / 60) : ""
  );
  const [destinos, setDestinos] = useState<DestinoId[]>(
    ordenarDestinos(task.destinos ?? [])
  );
  const { data: projects = [] } = useProjects(workspace.id, sectorId);
  const { data: members = [] } = useMembers(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);

  const cancelled = task.cancelled_at !== null;

  function scheduleSave(patch: TablesUpdate<"task">) {
    pending.current = { ...pending.current, ...patch };
    setStatus("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const p = pending.current;
      pending.current = {};
      update.mutate(
        { id: taskId, patch: p },
        {
          onSuccess: () => {
            setStatus("saved");
            // Reflete a edição no evento do Google, se a tarefa sincroniza.
            if (task.gcal_sync) void syncEvent(taskId);
          },
          onError: () => setStatus("idle"),
        }
      );
    }, 800);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <TextInput
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            aria-label="Título da tarefa"
            placeholder="Título da tarefa"
            className="border-transparent bg-transparent px-0 text-[length:var(--text-h2-size)] font-semibold hover:border-transparent"
          />
          <div className="text-fg-muted flex h-4 items-center gap-1 text-[length:var(--text-caption-size)]">
            {status === "saving" ? (
              <>
                <IconLoader2 size={12} className="animate-spin" aria-hidden />
                Salvando…
              </>
            ) : status === "saved" ? (
              <>
                <IconCheck size={12} aria-hidden />
                Salvo
              </>
            ) : null}
          </div>
        </div>

        {/* Cancelar e excluir saíram do rodapé permanente. Botão destrutivo
            visível o tempo todo, ao lado dos campos que se edita, é convite
            a um clique errado que não tem desfazer. */}
        <TaskActions
          taskId={taskId}
          titulo={task.title}
          cancelada={cancelled}
          onAlternarCancelamento={() =>
            toggleCancel.mutate({ id: taskId, cancel: !cancelled })
          }
          onExcluir={() => {
            deleteTask(task);
            closeModal();
            // Na página cheia não há modal para fechar: quem excluiu ficaria
            // olhando a tela de uma tarefa que acabou de deixar de existir.
            if (caminho?.startsWith("/tarefa/")) router.push("/lista");
          }}
        />
      </div>

      <GcalEditedBadge task={task} />

      {cancelled ? (
        <div className="border-line bg-sunken text-fg-secondary flex items-center gap-2 rounded-md border px-3 py-2 text-[length:var(--text-small-size)]">
          <IconBan size={16} stroke={1.5} />
          Esta demanda foi cancelada
        </div>
      ) : null}

      {/* "Visão geral" e não "Detalhes": esta aba responde o QUE é a
          demanda, e as outras três respondem como está sendo feita, o que
          o cliente vê e o que já aconteceu. "Detalhes" não separava nada —
          tudo ali é detalhe. */}
      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="trabalho">Trabalho</TabsTrigger>
          <TabsTrigger value="aprovacao">Aprovação</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Setor">
              <Select
                options={sectorOptions(sectors)}
                value={sectorId}
                onValueChange={(v) => {
                  setSectorId(v);
                  scheduleSave({ sector_id: v });
                }}
                aria-label="Setor"
              />
            </Field>
            <Field label="Prioridade">
              <Select
                options={PRIORITIES}
                value={priority}
                onValueChange={(v) => {
                  setPriority(v);
                  scheduleSave({ priority: v as TaskPriority });
                }}
                aria-label="Prioridade"
              />
            </Field>
          </div>

          <Field label="Projeto">
            <Select
              options={[
                { value: "__none__", label: "Nenhum" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={projectId ?? "__none__"}
              onValueChange={(v) => {
                const pid = v === "__none__" ? null : v;
                setProjectId(pid);
                scheduleSave({ project_id: pid });
              }}
              aria-label="Projeto"
            />
          </Field>

          <Field label="Cliente">
            <Select
              options={[
                { value: "__none__", label: "Nenhum" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={clientId ?? "__none__"}
              onValueChange={(v) => {
                const cid = v === "__none__" ? null : v;
                setClientId(cid);
                scheduleSave({ client_id: cid });
              }}
              aria-label="Cliente"
            />
          </Field>

          <Field label="Onde vai ser publicado">
            <DestinosSelector
              tituloVisivel={false}
              value={destinos}
              onChange={(ids) => {
                setDestinos(ids);
                scheduleSave({ destinos: ids });
              }}
            />
          </Field>

          <Field label="Tipo de demanda">
            <TextInput
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                scheduleSave({ service: e.target.value || null });
              }}
              placeholder="Ex.: Design, Suporte, Consultoria…"
              aria-label="Tipo de demanda"
            />
          </Field>

          <Field label="Prazo">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <TextInput
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    scheduleSave({ due_date: e.target.value || null });
                  }}
                  aria-label="Data do prazo"
                />
              </div>

              {/* Horário é opt-in: só aparece quando há data e o usuário pede. */}
              {dueDate && !timeOpen ? (
                <button
                  type="button"
                  onClick={() => setTimeOpen(true)}
                  className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[length:var(--text-small-size)]"
                >
                  <IconClock size={16} stroke={1.5} />
                  Adicionar horário
                </button>
              ) : null}

              {dueDate && timeOpen ? (
                <>
                  <div className="w-28">
                    <TextInput
                      type="time"
                      value={dueTime}
                      onChange={(e) => {
                        setDueTime(e.target.value);
                        scheduleSave({ due_time: e.target.value || null });
                      }}
                      aria-label="Hora de início"
                    />
                  </div>

                  {endOpen ? (
                    <>
                      <span className="text-fg-muted text-[length:var(--text-small-size)]">
                        até
                      </span>
                      <div className="w-28">
                        <TextInput
                          type="time"
                          value={dueEndTime}
                          onChange={(e) => {
                            setDueEndTime(e.target.value);
                            scheduleSave({
                              due_end_time: e.target.value || null,
                            });
                          }}
                          aria-label="Hora de término"
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Remover término"
                        onClick={() => {
                          setEndOpen(false);
                          setDueEndTime("");
                          scheduleSave({ due_end_time: null });
                        }}
                        className="text-fg-muted hover:text-fg rounded-sm p-1"
                      >
                        <IconX size={14} stroke={1.5} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEndOpen(true)}
                      className="text-fg-secondary hover:bg-hover hover:text-fg inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[length:var(--text-small-size)]"
                    >
                      <IconPlus size={14} stroke={1.5} />
                      Término
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setTimeOpen(false);
                      setEndOpen(false);
                      setDueTime("");
                      setDueEndTime("");
                      scheduleSave({ due_time: null, due_end_time: null });
                    }}
                    className="text-fg-muted hover:bg-hover hover:text-fg inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[length:var(--text-caption-size)]"
                  >
                    <IconX size={14} stroke={1.5} />
                    Dia inteiro
                  </button>
                </>
              ) : null}
            </div>
            <TaskMeetToggle taskId={taskId} />
          </Field>

          <TaskSyncToggle taskId={taskId} />

          <Field label="Responsável">
            <Select
              options={[
                { value: "__none__", label: "Ninguém" },
                ...members.map((m) => ({
                  value: m.user_id,
                  label: m.display_name ?? m.email,
                })),
              ]}
              value={assigneeId ?? "__none__"}
              onValueChange={(v) => {
                const aid = v === "__none__" ? null : v;
                setAssigneeId(aid);
                scheduleSave({ assignee_id: aid });
              }}
              aria-label="Responsável"
            />
          </Field>

          <Field label="Participantes">
            <ParticipantsSelector taskId={taskId} excludeUserId={assigneeId} />
          </Field>

          <Field label="Tags">
            <TagSelector taskId={taskId} />
          </Field>

          <Field label="Descrição">
            <MarkdownEditor
              value={description ?? ""}
              onChange={(v) => {
                setDescription(v);
                scheduleSave({ description: v || null });
              }}
              placeholder="Adicione detalhes…"
              aria-label="Descrição"
            />
          </Field>
        </TabsContent>

        <TabsContent value="trabalho">
          <Field label="Estimativa (horas)">
            <div className="w-24">
              <TextInput
                inputMode="decimal"
                value={estimateHours}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.,]/g, "");
                  setEstimateHours(v);
                  const hours = Number.parseFloat(v.replace(",", "."));
                  scheduleSave({
                    estimate_minutes:
                      Number.isFinite(hours) && hours > 0
                        ? Math.round(hours * 60)
                        : null,
                  });
                }}
                placeholder="Ex.: 2.5"
                aria-label="Estimativa em horas"
              />
            </div>
          </Field>

          <Field label="Tempo registrado">
            <TimeTracking
              taskId={taskId}
              taskTitle={title || task.title}
              estimateMinutes={task.estimate_minutes}
            />
          </Field>

          <Field label="Bloqueada por">
            <DependencySelector taskId={taskId} />
          </Field>

          <Field label="Subtarefas">
            <SubtaskList taskId={taskId} parentDue={dueDate || null} />
          </Field>

          <Field label="Anexos internos">
            {/* A frase é obrigatória, não decorativa: sem ela a única pista
                de que o arquivo NÃO vai para o cliente era um ícone de
                alternância no canto da linha. */}
            <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
              Arquivos desta área não são enviados ao cliente. O que vai para
              aprovação fica na aba Aprovação.
            </p>
            <AttachmentList taskId={taskId} filtro="internos" />
          </Field>
        </TabsContent>

        <TabsContent value="aprovacao">
          <TaskApprovalTab workspaceId={workspace.id} taskId={taskId} />
        </TabsContent>

        <TabsContent value="atividade">
          <Field label="Insights">
            <InsightLog taskId={taskId} />
          </Field>

          <Field label="Comentários">
            <CommentList taskId={taskId} />
          </Field>

          <Field label="Histórico">
            <TaskActivityLog taskId={taskId} sectorId={task.sector_id} />
          </Field>
        </TabsContent>
      </Tabs>
    </div>
  );
}
