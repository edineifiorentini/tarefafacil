"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { HexColorPicker } from "react-colorful";

import { Button } from "@/components/ui/Button";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { TextInput } from "@/components/ui/TextInput";
import { useCreateSector, useUpdateSector } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import {
  sectorColorPresets,
  sectorSchema,
  type SectorInput,
} from "@/lib/validation/sector";
import type { Sector } from "@/types/database";

import { IconPicker } from "./IconPicker";

export function SectorForm({
  mode,
  sector,
  onDone,
}: {
  mode: "create" | "edit";
  sector?: Sector;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const createSector = useCreateSector(workspace.id);
  const updateSector = useUpdateSector(workspace.id);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SectorInput>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      name: sector?.name ?? "",
      color: sector?.color ?? "#3B82F6",
      icon: sector?.icon ?? "IconFolder",
    },
  });

  const color = useWatch({ control, name: "color" });
  const icon = useWatch({ control, name: "icon" });

  function onSubmit(data: SectorInput) {
    if (mode === "create") createSector.mutate(data);
    else if (sector) updateSector.mutate({ id: sector.id, ...data });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="sector-name"
          className="text-[length:var(--text-small-size)] text-fg-secondary"
        >
          Nome
        </label>
        <TextInput
          id="sector-name"
          {...register("name")}
          error={!!errors.name}
          placeholder="Ex.: Marketing"
          autoFocus
        />
        {errors.name ? (
          <span
            role="alert"
            className="text-[length:var(--text-caption-size)] text-overdue"
          >
            {errors.name.message}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[length:var(--text-small-size)] text-fg-secondary">
          Cor
        </span>
        <HexColorPicker
          color={color}
          onChange={(c) => setValue("color", c, { shouldValidate: true })}
        />
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-7 w-7 shrink-0 rounded-full border border-line"
            style={{ background: color }}
          />
          <div className="w-28 shrink-0">
            <TextInput
              size="sm"
              aria-label="Cor hexadecimal"
              value={color}
              onChange={(e) =>
                setValue("color", e.target.value, { shouldValidate: true })
              }
              error={!!errors.color}
              className="font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {sectorColorPresets.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={p}
                onClick={() => setValue("color", p, { shouldValidate: true })}
                className="h-6 w-6 rounded-full border border-line"
                style={{ background: p }}
              />
            ))}
          </div>
        </div>
        {errors.color ? (
          <span
            role="alert"
            className="text-[length:var(--text-caption-size)] text-overdue"
          >
            {errors.color.message}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[length:var(--text-small-size)] text-fg-secondary">
          Ícone
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-sunken text-fg">
            <DynamicIcon name={icon} />
          </span>
          <span className="text-[length:var(--text-small-size)] text-fg-muted">
            {icon.slice(4)}
          </span>
        </div>
        <IconPicker
          value={icon}
          onChange={(n) => setValue("icon", n, { shouldValidate: true })}
        />
        {errors.icon ? (
          <span
            role="alert"
            className="text-[length:var(--text-caption-size)] text-overdue"
          >
            {errors.icon.message}
          </span>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {mode === "create" ? "Criar setor" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
