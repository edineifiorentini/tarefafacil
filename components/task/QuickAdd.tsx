"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";
import { useSectors } from "@/lib/queries/useSectors";
import { useCreateTask } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sectorOptions } from "@/lib/sectors/options";
import { quickAddSchema, type QuickAddInput } from "@/lib/validation/task";

import { SectorForm } from "@/components/sector/SectorForm";

import { TaskDetailPanel } from "./TaskDetailPanel";

export function QuickAdd({ defaultSectorId }: { defaultSectorId?: string }) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const createTask = useCreateTask(workspace.id);
  const toast = useToast();
  const { openPanel, closePanel } = useShell();

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
    },
  });

  const sectorId = useWatch({ control, name: "sector_id" });

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
    // Mantém setor e prazo; limpa o título e volta o foco (registro em sequência).
    reset({ title: "", sector_id: data.sector_id, due_date: data.due_date });
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
    </form>
  );
}
