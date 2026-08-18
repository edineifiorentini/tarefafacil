"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useSectors } from "@/lib/queries/useSectors";
import { useCreateTask } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { sectorOptions } from "@/lib/sectors/options";
import { quickAddSchema, type QuickAddInput } from "@/lib/validation/task";

export function QuickAdd({ defaultSectorId }: { defaultSectorId?: string }) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const createTask = useCreateTask(workspace.id);

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
    createTask.mutate({ ...data, due_date: data.due_date || null });
    // Mantém setor e prazo; limpa o título e volta o foco (registro em sequência).
    reset({ title: "", sector_id: data.sector_id, due_date: data.due_date });
    setFocus("title");
  }

  if (sectors.length === 0) {
    return (
      <p className="text-fg-secondary text-[length:var(--text-small-size)]">
        Crie um setor antes de adicionar tarefas.
      </p>
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
