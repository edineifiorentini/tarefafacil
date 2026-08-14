"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useCreateProject, useUpdateProject } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import {
  projectSchema,
  projectStatusLabels,
  projectStatuses,
  type ProjectInput,
} from "@/lib/validation/project";
import type { Project } from "@/types/database";

export function ProjectForm({
  mode,
  project,
  defaultSectorId,
  onDone,
}: {
  mode: "create" | "edit";
  project?: Project;
  defaultSectorId?: string;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const create = useCreateProject(workspace.id);
  const update = useUpdateProject(workspace.id);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      sector_id: project?.sector_id ?? defaultSectorId ?? sectors[0]?.id ?? "",
      description: project?.description ?? "",
      starts_on: project?.starts_on ?? "",
      ends_on: project?.ends_on ?? "",
      status: project?.status ?? "planejado",
    },
  });

  const sectorId = useWatch({ control, name: "sector_id" });
  const status = useWatch({ control, name: "status" });

  function onSubmit(data: ProjectInput) {
    const clean: ProjectInput = {
      ...data,
      description: data.description || null,
      starts_on: data.starts_on || null,
      ends_on: data.ends_on || null,
    };
    if (mode === "create") create.mutate(clean);
    else if (project) update.mutate({ id: project.id, ...clean });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="project-name"
          className="text-fg-secondary text-[length:var(--text-small-size)]"
        >
          Nome
        </label>
        <TextInput
          id="project-name"
          {...register("name")}
          error={!!errors.name}
          placeholder="Ex.: Campanha de lançamento"
          autoFocus
        />
        {errors.name ? (
          <span
            role="alert"
            className="text-overdue text-[length:var(--text-caption-size)]"
          >
            {errors.name.message}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-fg-secondary text-[length:var(--text-small-size)]">
            Setor
          </span>
          <Select
            options={sectors.map((s) => ({ value: s.id, label: s.name }))}
            value={sectorId}
            onValueChange={(v) =>
              setValue("sector_id", v, { shouldValidate: true })
            }
            aria-label="Setor"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-fg-secondary text-[length:var(--text-small-size)]">
            Status
          </span>
          <Select
            options={projectStatuses.map((s) => ({
              value: s,
              label: projectStatusLabels[s],
            }))}
            value={status}
            onValueChange={(v) =>
              setValue("status", v as ProjectInput["status"], {
                shouldValidate: true,
              })
            }
            aria-label="Status"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="project-start"
            className="text-fg-secondary text-[length:var(--text-small-size)]"
          >
            Início
          </label>
          <TextInput
            id="project-start"
            type="date"
            {...register("starts_on")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="project-end"
            className="text-fg-secondary text-[length:var(--text-small-size)]"
          >
            Fim
          </label>
          <TextInput id="project-end" type="date" {...register("ends_on")} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="project-desc"
          className="text-fg-secondary text-[length:var(--text-small-size)]"
        >
          Descrição
        </label>
        <Textarea
          id="project-desc"
          autogrow
          {...register("description")}
          placeholder="Opcional"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {mode === "create" ? "Criar projeto" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
