"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { useClients } from "@/lib/queries/useClients";
import { useMembers } from "@/lib/queries/useMembers";
import { useProjects } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import { useCreateTask } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sectorOptions } from "@/lib/sectors/options";
import { quickAddSchema, type QuickAddInput } from "@/lib/validation/task";

import { SectorForm } from "@/components/sector/SectorForm";

import { TaskDetailPanel } from "./TaskDetailPanel";

/** "Nenhum" precisa de um valor: Radix Select não aceita item com value "". */
const NENHUM = "__none__";

const PRIORIDADES = [
  { value: "sem_prioridade", label: "Sem prioridade" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-fg-secondary text-[length:var(--text-caption-size)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function QuickAdd({ defaultSectorId }: { defaultSectorId?: string }) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const { data: projects = [] } = useProjects(workspace.id);
  const createTask = useCreateTask(workspace.id);
  const toast = useToast();
  const { openPanel, closePanel } = useShell();

  // Fechado por padrão: o caminho rápido é o que faz este formulário valer.
  // Quem abriu uma vez costuma abrir de novo, então fica aberto no registro
  // seguinte — a preferência dura a sessão do painel, não vai para o banco.
  const [detalhes, setDetalhes] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<QuickAddInput>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      title: "",
      sector_id: defaultSectorId ?? sectors[0]?.id ?? "",
      due_date: "",
      priority: "media",
      assignee_id: null,
      client_id: null,
      project_id: null,
      service: "",
      description: "",
      estimate_hours: "",
    },
  });

  const sectorId = useWatch({ control, name: "sector_id" });
  const priority = useWatch({ control, name: "priority" });
  const assigneeId = useWatch({ control, name: "assignee_id" });
  const clientId = useWatch({ control, name: "client_id" });
  const projectId = useWatch({ control, name: "project_id" });

  function onSubmit(data: QuickAddInput) {
    createTask.mutate(
      { ...data, due_date: data.due_date || null },
      {
        onSuccess: (task) => {
          // Sem isto o botão não dava sinal nenhum de vida e a pessoa ficava
          // sem saber se a tarefa foi criada. O nome do setor no texto é o
          // que confirma que ela foi parar no lugar certo.
          const setor = sectors.find((x) => x.id === data.sector_id)?.name;
          toast.show({
            message: setor ? `Tarefa criada em ${setor}` : "Tarefa criada",
            actionLabel: "Ver tarefa",
            // 6s em vez de 5: este aviso tem ação, e ação precisa de tempo
            // para ser notada e alcançada.
            duration: 6000,
            onAction: () =>
              openPanel({
                title: "Tarefa",
                node: <TaskDetailPanel taskId={task.id} />,
              }),
          });
        },
        onError: () =>
          toast.show({ message: "Não foi possível criar a tarefa" }),
      }
    );
    // Registro em sequência: limpa só o que é único de cada tarefa (título,
    // descrição, estimativa) e mantém o enquadramento — setor, prazo,
    // prioridade, responsável, cliente, projeto e tipo. Quem está lançando as
    // demandas da semana de um cliente não quer reescolher o cliente sete
    // vezes.
    reset({
      ...data,
      title: "",
      description: "",
      estimate_hours: "",
    });
    setFocus("title");
  }

  // Workspace novo já nasce com um setor (migration 0043), então isto só
  // aparece se alguém apagar todos. Ainda assim é um botão, não uma frase:
  // um aviso que manda fazer algo sem oferecer o caminho é um beco sem saída.
  if (sectors.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Tarefas ficam dentro de um setor, e não há nenhum ainda.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            openPanel({
              title: "Novo setor",
              node: <SectorForm mode="create" onDone={closePanel} />,
            })
          }
        >
          Criar setor
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <TextInput
        {...register("title")}
        placeholder="Título da tarefa"
        aria-label="Título da tarefa"
        error={!!errors.title}
        autoFocus
      />
      {errors.title ? (
        <span
          role="alert"
          className="text-overdue text-[length:var(--text-caption-size)]"
        >
          {errors.title.message}
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            options={sectorOptions(sectors)}
            value={sectorId}
            onValueChange={(v) =>
              setValue("sector_id", v, { shouldValidate: true })
            }
            placeholder="Setor"
            aria-label="Setor"
            error={!!errors.sector_id}
          />
        </div>
        <div className="w-40 shrink-0">
          <TextInput type="date" {...register("due_date")} aria-label="Prazo" />
        </div>
        <Button type="submit" variant="primary">
          Criar
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setDetalhes((v) => !v)}
        aria-expanded={detalhes}
        className="text-fg-secondary hover:text-fg flex w-fit items-center gap-1 rounded-sm text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <IconChevronDown
          size={14}
          stroke={1.5}
          className={`transition-transform [transition-duration:var(--dur-fast)] ${
            detalhes ? "rotate-180" : ""
          }`}
          aria-hidden
        />
        Mais detalhes
      </button>

      {detalhes ? (
        <div className="border-line flex flex-col gap-3 border-t pt-3">
          <div className="flex gap-2">
            <Campo label="Prioridade">
              <Select
                options={PRIORIDADES}
                value={priority ?? "media"}
                onValueChange={(v) =>
                  setValue("priority", v as QuickAddInput["priority"])
                }
                aria-label="Prioridade"
              />
            </Campo>
            <Campo label="Responsável">
              <Select
                options={[
                  { value: NENHUM, label: "Ninguém" },
                  ...members.map((m) => ({
                    value: m.user_id,
                    label: m.display_name ?? m.email,
                  })),
                ]}
                value={assigneeId ?? NENHUM}
                onValueChange={(v) =>
                  setValue("assignee_id", v === NENHUM ? null : v)
                }
                aria-label="Responsável"
              />
            </Campo>
          </div>

          <div className="flex gap-2">
            <Campo label="Cliente">
              <Select
                options={[
                  { value: NENHUM, label: "Nenhum" },
                  ...clients.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={clientId ?? NENHUM}
                onValueChange={(v) =>
                  setValue("client_id", v === NENHUM ? null : v)
                }
                aria-label="Cliente"
              />
            </Campo>
            <Campo label="Projeto">
              <Select
                options={[
                  { value: NENHUM, label: "Nenhum" },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={projectId ?? NENHUM}
                onValueChange={(v) =>
                  setValue("project_id", v === NENHUM ? null : v)
                }
                aria-label="Projeto"
              />
            </Campo>
          </div>

          <div className="flex gap-2">
            <Campo label="Tipo de demanda">
              <TextInput
                {...register("service")}
                placeholder="Ex.: post, banner"
                aria-label="Tipo de demanda"
              />
            </Campo>
            <div className="w-28 shrink-0">
              <Campo label="Estimativa (h)">
                <TextInput
                  inputMode="decimal"
                  {...register("estimate_hours")}
                  placeholder="Ex.: 2.5"
                  aria-label="Estimativa em horas"
                />
              </Campo>
            </div>
          </div>

          <Campo label="Descrição">
            <Textarea
              {...register("description")}
              rows={3}
              placeholder="O que precisa ser feito"
              aria-label="Descrição"
            />
          </Campo>

          {/* Anexo, subtarefa e tag não cabem aqui: precisam da tarefa já
              salva para se pendurar nela. Ficam no painel de detalhe. */}
        </div>
      ) : null}
    </form>
  );
}
