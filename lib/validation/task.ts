import { z } from "zod";

export const taskPriorities = ["baixa", "media", "alta"] as const;

// Criação rápida — 3 campos (design 6.1): título, setor, prazo (opcional).
export const quickAddSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe um título")
    .max(200, "No máximo 200 caracteres"),
  sector_id: z.string().uuid("Escolha um setor"),
  due_date: z.string().nullable().optional(),
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;
