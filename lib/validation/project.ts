import { z } from "zod";

export const projectStatuses = [
  "planejado",
  "ativo",
  "pausado",
  "concluido",
] as const;

export const projectStatusLabels: Record<
  (typeof projectStatuses)[number],
  string
> = {
  planejado: "Planejado",
  ativo: "Ativo",
  pausado: "Pausado",
  concluido: "Concluído",
};

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome")
    .max(120, "No máximo 120 caracteres"),
  sector_id: z.string().uuid("Escolha um setor"),
  description: z.string().max(2000).nullable().optional(),
  starts_on: z.string().nullable().optional(),
  ends_on: z.string().nullable().optional(),
  status: z.enum(projectStatuses),
});

export type ProjectInput = z.infer<typeof projectSchema>;
